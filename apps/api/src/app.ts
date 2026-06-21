import crypto from "crypto";
import jwt from "jsonwebtoken";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { z } from "zod";
import { calculateXpForChallengeCompletion, calculateXpForVerificationVote, challengeCreateSchema, proofSubmissionSchema, sendXlmSchema, voteSchema } from "@skillstake/shared";
import { env } from "./config";
import { Achievement, Activity, Challenge, LeaderboardSnapshot, Nonce, Notification, Proof, RewardPool, Transaction, User, Vote } from "./models";
import { buildAuthTransaction, verifyTransactionSignature, buildContractTxXdr, explorerUrl, fetchContractEvents, fetchXlmBalance, prepareSendXlmTx, submitTransactionXdr } from "./services";

const walletParamSchema = z.object({ address: z.string().min(1) });
const idParamSchema = z.object({ id: z.string().min(1) });

export function createApp() {
  const app = express();

  const allowedOrigins = env.ALLOWED_ORIGIN.split(",").map((o) => o.trim());
  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes("*") || 
        allowedOrigins.includes(origin) ||
        (env.NODE_ENV === "development" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(rateLimit({ windowMs: 60_000, limit: 200 }));
  app.use(pinoHttp());

  function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Access token required" });
      return;
    }

    jwt.verify(token, env.JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        res.status(403).json({ message: "Invalid or expired session token" });
        return;
      }
      (req as any).user = decoded;
      next();
    });
  }

  app.get("/api/auth/nonce", async (req, res, next) => {
    try {
      const address = z.string().min(20).parse(req.query.address);
      const nonceVal = crypto.randomBytes(16).toString("hex");
      
      await Nonce.findOneAndUpdate(
        { walletAddress: address },
        { nonce: nonceVal },
        { upsert: true, new: true }
      );
      
      const xdr = await buildAuthTransaction(address, nonceVal, env.VITE_STELLAR_NETWORK_PASSPHRASE);
      res.json({ nonce: nonceVal, xdr });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/verify", async (req, res, next) => {
    try {
      const { walletAddress, signedXdr } = z.object({
        walletAddress: z.string().min(20),
        signedXdr: z.string().min(10)
      }).parse(req.body);

      const record = await Nonce.findOne({ walletAddress });
      if (!record) {
        res.status(401).json({ message: "No active authentication challenge found for this address" });
        return;
      }

      const isValid = await verifyTransactionSignature(
        signedXdr,
        walletAddress,
        record.nonce,
        env.VITE_STELLAR_NETWORK_PASSPHRASE
      );

      if (!isValid) {
        res.status(401).json({ message: "Invalid transaction signature. Authentication failed." });
        return;
      }

      await Nonce.deleteOne({ walletAddress });

      await User.updateOne(
        { walletAddress },
        { $setOnInsert: { walletAddress, displayName: "Anonymous", xp: 0 } },
        { upsert: true }
      );

      const token = jwt.sign({ walletAddress }, env.JWT_SECRET, { expiresIn: "24h" });

      res.json({ token, walletAddress });
    } catch (error) {
      next(error);
    }
  });

  app.get("/health", async (_req, res) => {
    const rewardPool = await RewardPool.findOne().lean();
    res.json({ ok: true, service: "skillstake-api", rewardPoolBalance: rewardPool?.currentBalance ?? 0 });
  });

  app.get("/api/network", (_req, res) => {
    res.json({
      passphrase: env.VITE_STELLAR_NETWORK_PASSPHRASE,
      rpcUrl: env.VITE_SOROBAN_RPC_URL,
      horizonUrl: env.VITE_HORIZON_URL,
      explorerBase: env.VITE_STELLAR_EXPLORER_BASE,
      contractId: env.VITE_CONTRACT_ID,
    });
  });

  app.get("/api/wallet/:address/balance", async (req, res, next) => {
    try {
      const { address } = walletParamSchema.parse(req.params);
      const balance = await fetchXlmBalance(address);
      const user = await User.findOne({ walletAddress: address }).lean();
      res.json({ address, balance, user });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/transactions/send-xlm/prepare", async (req, res, next) => {
    try {
      const payload = sendXlmSchema.parse(req.body);
      const xdr = await prepareSendXlmTx(
        payload.memo
          ? {
              source: payload.sourceAddress,
              destination: payload.destinationAddress,
              amount: payload.amount.toFixed(7),
              memo: payload.memo,
            }
          : {
              source: payload.sourceAddress,
              destination: payload.destinationAddress,
              amount: payload.amount.toFixed(7),
            },
      );
      const record = await Transaction.create({
        walletAddress: payload.sourceAddress,
        type: "send_xlm",
        status: "preparing",
        xdr,
        network: env.VITE_STELLAR_NETWORK_PASSPHRASE,
      });
      res.json({ transactionId: record._id.toString(), xdr });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/transactions/submit", async (req, res, next) => {
    try {
      const body = z.object({ xdr: z.string().min(1), walletAddress: z.string().min(1), type: z.string().min(1) }).parse(req.body);
      const submission = await submitTransactionXdr(body.xdr);
      const txHash = submission.hash ?? submission.id ?? "";
      await Transaction.create({
        walletAddress: body.walletAddress,
        type: body.type,
        status: "pending",
        txHash,
        xdr: body.xdr,
        explorerUrl: txHash ? explorerUrl(txHash) : "",
        network: env.VITE_STELLAR_NETWORK_PASSPHRASE,
      });
      res.json({ status: "pending", txHash, explorerUrl: txHash ? explorerUrl(txHash) : "" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/contracts/prepare", async (req, res, next) => {
    try {
      const body = z.object({ method: z.string().min(1), sourceAddress: z.string().min(1), args: z.array(z.unknown()).default([]) }).parse(req.body);
      const xdr = await buildContractTxXdr(body.method, body.args, body.sourceAddress);
      res.json({ xdr });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/challenges", async (_req, res, next) => {
    try {
      const challenges = await Challenge.find().sort({ createdAt: -1 }).lean();
      res.json({ challenges });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/challenges/:id", async (req, res, next) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const challenge = await Challenge.findById(id).lean();
      const proofs = await Proof.find({ challengeId: id }).sort({ createdAt: -1 }).lean();
      if (!challenge) {
        res.status(404).json({ message: "Challenge not found" });
        return;
      }
      res.json({ challenge, proofs });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/challenges", authenticateToken, async (req, res, next) => {
    try {
      const payload = challengeCreateSchema.parse(req.body);
      if (payload.creatorAddress !== (req as any).user.walletAddress) {
        res.status(403).json({ message: "Forbidden: Wallet address spoofing detected" });
        return;
      }
      const created = await Challenge.create({
        creatorAddress: payload.creatorAddress,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        stakeAmount: payload.stakeAmount,
        durationDays: payload.durationDays,
        verificationThreshold: payload.verificationThreshold,
        status: "active",
      });
      await Activity.create({
        kind: "user_created_challenge",
        actorAddress: payload.creatorAddress,
        challengeId: created._id,
        message: `${payload.creatorAddress} created ${payload.title}`,
        meta: { title: payload.title, stakeAmount: payload.stakeAmount },
      });
      await User.updateOne(
        { walletAddress: payload.creatorAddress },
        { $setOnInsert: { walletAddress: payload.creatorAddress }, $inc: { totalXlmStaked: payload.stakeAmount, xp: calculateXpForChallengeCompletion(payload.stakeAmount, 0) } },
        { upsert: true },
      );
      res.status(201).json({ challenge: created });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/challenges/:id/proofs", authenticateToken, async (req, res, next) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const payload = proofSubmissionSchema.parse({ ...req.body, challengeId: id });
      if (payload.submitterAddress !== (req as any).user.walletAddress) {
        res.status(403).json({ message: "Forbidden: Wallet address spoofing detected" });
        return;
      }
      const challenge = await Challenge.findById(id);
      if (!challenge) {
        res.status(404).json({ message: "Challenge not found" });
        return;
      }
      const proof = await Proof.create({
        challengeId: challenge._id,
        submitterAddress: payload.submitterAddress,
        title: payload.title,
        description: payload.description,
        githubLink: payload.githubLink ?? "",
        externalUrl: payload.externalUrl ?? "",
        textEvidence: payload.textEvidence,
        status: "pending",
      });
      challenge.status = "proof_submitted";
      challenge.proofCount += 1;
      await challenge.save();
      await Activity.create({
        kind: "user_submitted_proof",
        actorAddress: payload.submitterAddress,
        challengeId: challenge._id,
        proofId: proof._id,
        message: `${payload.submitterAddress} submitted proof for ${challenge.title}`,
        meta: { proofId: proof._id.toString() },
      });
      res.status(201).json({ proof });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/proofs/:id/votes", authenticateToken, async (req, res, next) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const payload = voteSchema.parse({ ...req.body, proofId: id });
      if (payload.voterAddress !== (req as any).user.walletAddress) {
        res.status(403).json({ message: "Forbidden: Wallet address spoofing detected" });
        return;
      }
      const proof = await Proof.findById(id);
      if (!proof) {
        res.status(404).json({ message: "Proof not found" });
        return;
      }
      const challenge = await Challenge.findById(proof.challengeId);
      if (!challenge) {
        res.status(404).json({ message: "Challenge not found" });
        return;
      }
      if (payload.voterAddress === proof.submitterAddress || payload.voterAddress === challenge.creatorAddress) {
        res.status(400).json({ message: "Self-voting is not allowed" });
        return;
      }
      const existing = await Vote.findOne({ proofId: proof._id, voterAddress: payload.voterAddress });
      if (existing) {
        res.status(409).json({ message: "Duplicate vote" });
        return;
      }
      const vote = await Vote.create({
        challengeId: challenge._id,
        proofId: proof._id,
        voterAddress: payload.voterAddress,
        decision: payload.decision,
      });
      if (payload.decision === "approve") {
        challenge.approvedVotes += 1;
        proof.voteCount += 1;
      } else {
        challenge.rejectedVotes += 1;
      }
      if (challenge.approvedVotes >= challenge.verificationThreshold) {
        challenge.status = "completed";
        proof.status = "approved";
        await RewardPool.updateOne({}, { $inc: { currentBalance: -challenge.stakeAmount } }, { upsert: true });
        await Activity.create({
          kind: "community_approved_proof",
          actorAddress: payload.voterAddress,
          challengeId: challenge._id,
          proofId: proof._id,
          message: `Community approved proof for ${challenge.title}`,
          meta: { voteId: vote._id.toString() },
        });
      }
      if (challenge.rejectedVotes >= challenge.verificationThreshold) {
        challenge.status = "failed";
        proof.status = "rejected";
        const rewardPool = await RewardPool.findOneAndUpdate({}, { $inc: { currentBalance: challenge.stakeAmount } }, { upsert: true, new: true });
        await Activity.create({
          kind: "challenge_failed",
          actorAddress: payload.voterAddress,
          challengeId: challenge._id,
          proofId: proof._id,
          message: `Challenge failed and stake moved to reward pool`,
          meta: { rewardPoolBalance: rewardPool?.currentBalance ?? challenge.stakeAmount },
        });
      }
      await proof.save();
      await challenge.save();
      await Activity.create({
        kind: payload.decision === "approve" ? "community_approved_proof" : "community_rejected_proof",
        actorAddress: payload.voterAddress,
        challengeId: challenge._id,
        proofId: proof._id,
        message: `${payload.voterAddress} voted ${payload.decision} on ${challenge.title}`,
      });
      await User.updateOne(
        { walletAddress: payload.voterAddress },
        {
          $setOnInsert: { walletAddress: payload.voterAddress },
          $inc: { xp: calculateXpForVerificationVote(payload.decision) },
        },
        { upsert: true },
      );
      res.status(201).json({ vote, challenge, proof });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/reward-pool", async (_req, res, next) => {
    try {
      const onChainBalance = await fetchXlmBalance(env.REWARD_POOL_TREASURY_ADDRESS);
      const rewardPool = await RewardPool.findOne().lean();
      res.json({
        rewardPool: {
          currentBalance: onChainBalance,
          historicalDistributions: rewardPool?.historicalDistributions ?? [],
          topContributors: rewardPool?.topContributors ?? [],
          topEarners: rewardPool?.topEarners ?? []
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/leaderboard/:scope", async (req, res, next) => {
    try {
      const scope = z.enum(["global", "weekly", "success-rate", "xp", "staked"]).parse(req.params.scope);
      const rows = await User.find().sort(scope === "success-rate" ? { successRate: -1, xp: -1 } : scope === "staked" ? { totalXlmStaked: -1, xp: -1 } : { xp: -1 }).lean();
      const payload = rows.map((row, index) => ({
        walletAddress: row.walletAddress,
        displayName: row.displayName,
        xp: row.xp,
        successRate: row.successRate,
        totalXlmStaked: row.totalXlmStaked,
        rank: index + 1,
      }));
      await LeaderboardSnapshot.findOneAndUpdate({ scope }, { scope, rows: payload, generatedAt: new Date() }, { upsert: true, new: true });
      res.json({ scope, rows: payload });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/profile/:address", async (req, res, next) => {
    try {
      const { address } = walletParamSchema.parse(req.params);
      const user = await User.findOne({ walletAddress: address }).lean();
      const challenges = await Challenge.find({ creatorAddress: address }).sort({ createdAt: -1 }).lean();
      const achievements = await Achievement.find({ walletAddress: address }).sort({ createdAt: -1 }).lean();
      const proofs = await Proof.find({ submitterAddress: address }).sort({ createdAt: -1 }).lean();
      res.json({ user, challenges, achievements, proofs });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/notifications/:address", async (req, res, next) => {
    try {
      const { address } = walletParamSchema.parse(req.params);
      const notifications = await Notification.find({ walletAddress: address }).sort({ createdAt: -1 }).lean();
      res.json({ notifications });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/activities", async (_req, res, next) => {
    try {
      const activities = await Activity.find().sort({ createdAt: -1 }).limit(50).lean();
      const contractEvents = await fetchContractEvents();
      res.json({ activities, contractEvents });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/activities/stream", async (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const interval = setInterval(async () => {
        const latest = await Activity.find().sort({ createdAt: -1 }).limit(20).lean();
        res.write(`event: activities\n`);
        res.write(`data: ${JSON.stringify(latest)}\n\n`);
      }, env.SCHEDULER_POLL_INTERVAL_MS);

      req.on("close", () => {
        clearInterval(interval);
        res.end();
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    res.status(400).json({ message });
  });

  return app;
}
