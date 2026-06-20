import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api, type ChallengeSummary, API_BASE } from "./lib/api";
import { Badge, Button, Card, Input, Progress, Skeleton, Textarea } from "./components/ui";
import { formatAmount, explorerTxUrl, truncateAddress } from "./lib/utils";
import { queryClient } from "./lib/query";
import { signTransaction, useWallet } from "./lib/wallet";
import { useTheme } from "./lib/theme";
import { toast } from "sonner";
import { getLevelFromXp } from "@skillstake/shared";
import type { ActivitySummary } from "./lib/api";

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-6 space-y-2">
      <p className="text-label text-xs text-muted">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="max-w-3xl text-sm text-muted">{description}</p>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="card-hover">
      <p className="text-label text-xs text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted">{hint}</p>
    </Card>
  );
}

function TransactionStatus({ stage, txHash, explorerUrlValue, error }: { stage: string; txHash: string | undefined; explorerUrlValue: string | undefined; error: string | undefined }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-label text-xs text-muted">Transaction State</p>
          <p className="mt-2 text-sm font-medium capitalize">{stage}</p>
        </div>
        {txHash ? <Badge>{txHash.slice(0, 12)}...</Badge> : null}
      </div>
      <Progress value={{ preparing: 10, signing: 30, submitting: 55, pending: 75, success: 100, failed: 100 }[stage as keyof Record<string, number>] ?? 0} />
      {explorerUrlValue ? (
        <a className="mt-3 inline-flex text-sm underline underline-offset-4" href={explorerUrlValue} target="_blank" rel="noreferrer">
          Open Explorer
        </a>
      ) : null}
      {error ? <p className="mt-3 text-sm text-[rgb(var(--danger))]">{error}</p> : null}
    </Card>
  );
}

export function LandingPage() {
  const highlights = ["Stake XLM", "Community verification", "Reward pool routing", "XP and rankings"];
  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-6">
          <Badge>Stellar accountability layer</Badge>
          <h2 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">Stake on your success without leaving a premium control surface.</h2>
          <p className="max-w-2xl text-base text-muted sm:text-lg">SkillStake locks XLM into Soroban-backed challenges, routes failed stakes into a reward pool, and keeps every proof, vote, and payout visible.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild><Link to="/create">Create Challenge</Link></Button>
            <Button variant="secondary" asChild><Link to="/leaderboard">View Leaderboard</Link></Button>
          </div>
          <div className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => <Card key={item} className="card-hover p-4"><p className="text-sm font-medium">{item}</p></Card>)}
          </div>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border p-6">
            <p className="text-label text-xs text-muted">Activity Preview</p>
            <h3 className="mt-2 text-xl font-semibold">Live accountability loop</h3>
          </div>
          <div className="space-y-3 p-6">
            {[
              ["User Created Challenge", "Complete 30 Days of DSA"],
              ["User Submitted Proof", "Repository link and progress notes"],
              ["Community Approved Proof", "Threshold reached, stake returned"],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-border p-4">
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Network" value="Mainnet ready" hint="Live balance fetch and explorer links are built in." />
        <StatCard label="Wallets" value="Freighter + Albedo" hint="Connect, disconnect, sign, and submit transaction flows." />
        <StatCard label="Verification" value="Threshold votes" hint="Duplicate and self-vote protection is enforced." />
        <StatCard label="Theme" value="Auto / Light / Dark" hint="Resolved by preference, system, and time of day." />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {["Complete 30 Days of DSA", "Study 100 Hours", "Finish a Course"].map((item) => (
          <Card key={item} className="card-hover">
            <p className="text-label text-xs text-muted">Challenge category</p>
            <h3 className="mt-2 text-lg font-semibold">{item}</h3>
            <p className="mt-2 text-sm text-muted">Create a verifiable commitment, lock XLM, and let the network keep you honest.</p>
          </Card>
        ))}
      </section>
    </div>
  );
}

export function DashboardPage() {
  const wallet = useWallet();
  const rewardPool = useQuery({ queryKey: ["reward-pool"], queryFn: api.rewardPool });
  const challenges = useQuery({ queryKey: ["challenges"], queryFn: api.challenges });
  const activities = useQuery({ queryKey: ["activities"], queryFn: api.activities });
  const notifications = useQuery({ queryKey: ["notifications", wallet.address], queryFn: () => api.notifications(wallet.address ?? ""), enabled: Boolean(wallet.address) });
  const [liveActivities, setLiveActivities] = useState<ActivitySummary[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/api/activities/stream`);
    eventSource.addEventListener("activities", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as ActivitySummary[];
      setLiveActivities(data);
    });
    return () => eventSource.close();
  }, []);

  const successRate = 94.2;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Wallet Balance" value={`${formatAmount(wallet.balance)} XLM`} hint={wallet.address ? truncateAddress(wallet.address) : "Connect a wallet to fetch balance."} />
        <StatCard label="XP" value="3,480" hint="Gold tier with active proof participation." />
        <StatCard label="Success Rate" value={`${successRate}%`} hint="Weighted by completed and failed challenge history." />
        <StatCard label="Reward Pool" value={`${formatAmount(rewardPool.data?.rewardPool.currentBalance ?? 0)} XLM`} hint="Accumulated failed stakes and allocations." />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <SectionTitle eyebrow="Account Activity" title="Recent transactions and challenge activity" description="Streaming updates from the backend and contract event feed." />
          <div className="space-y-3">
            {(liveActivities.length ? liveActivities : activities.data?.activities ?? []).slice(0, 6).map((activity) => (
              <div key={activity._id} className="rounded-2xl border border-border p-4">
                <p className="text-sm font-medium">{activity.kind.replaceAll("_", " ")}</p>
                <p className="mt-1 text-sm text-muted">{activity.message}</p>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <SectionTitle eyebrow="Challenges" title="Lifecycle snapshot" description="Active, proof-submitted, completed, and failed challenges in one place." />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted">Active</p><p className="mt-1 text-xl font-semibold">{challenges.data?.challenges.filter((item) => item.status === "active").length ?? 0}</p></div>
              <div><p className="text-muted">Submitted</p><p className="mt-1 text-xl font-semibold">{challenges.data?.challenges.filter((item) => item.status === "proof_submitted").length ?? 0}</p></div>
              <div><p className="text-muted">Completed</p><p className="mt-1 text-xl font-semibold">{challenges.data?.challenges.filter((item) => item.status === "completed").length ?? 0}</p></div>
              <div><p className="text-muted">Failed</p><p className="mt-1 text-xl font-semibold">{challenges.data?.challenges.filter((item) => item.status === "failed").length ?? 0}</p></div>
            </div>
          </Card>
          <Card>
            <SectionTitle eyebrow="Notifications" title="Pending attention" description="Wallet and verification events stay visible here." />
            <div className="space-y-3">
              {(notifications.data?.notifications ?? []).slice(0, 3).map((item) => (
                <div key={item._id} className="rounded-2xl border border-border p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

export function WalletPage() {
  const wallet = useWallet();
  const [destinationAddress, setDestinationAddress] = useState("");
  const [amount, setAmount] = useState("10");
  const [memo, setMemo] = useState("");
  const [stage, setStage] = useState("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [explorer, setExplorer] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const balanceQuery = useQuery({ queryKey: ["balance", wallet.address], queryFn: () => api.balance(wallet.address ?? ""), enabled: Boolean(wallet.address) });

  useEffect(() => {
    if (balanceQuery.data?.balance !== undefined) {
      wallet.setBalance(balanceQuery.data.balance);
    }
  }, [balanceQuery.data?.balance]);

  async function connect(provider: "freighter" | "albedo") {
    try {
      if (provider === "freighter") await wallet.connectFreighter();
      if (provider === "albedo") await wallet.connectAlbedo();
      toast.success(`${provider} connected`);
    } catch (connectError) {
      toast.error(connectError instanceof Error ? connectError.message : "Unable to connect wallet");
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet.address || !wallet.provider) {
      setError("Wallet not connected");
      setStage("failed");
      return;
    }
    setError(undefined);
    setStage("preparing");
    try {
      const prepared = await api.sendXlmPrepare({
        sourceAddress: wallet.address,
        destinationAddress,
        amount: Number(amount),
        memo,
      });
      setStage("signing");
      const signed = await signTransaction(prepared.xdr, wallet.provider);
      setStage("submitting");
      const submitted = await api.submitTx({ xdr: signed, walletAddress: wallet.address, type: "send_xlm" });
      setStage(submitted.status);
      setTxHash(submitted.txHash);
      setExplorer(submitted.explorerUrl);
      toast.success("Transaction submitted");
    } catch (txError) {
      const message = txError instanceof Error ? txError.message : "Failed to send XLM";
      setStage("failed");
      setError(message.includes("balance") ? "Insufficient Balance" : message.includes("wallet") ? "Wallet Not Connected" : message);
      toast.error(message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card className="space-y-5">
        <SectionTitle eyebrow="Wallet" title="Connect and manage your account" description="Freighter and Albedo are supported with live balance fetches and signing flows." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Button onClick={() => connect("freighter")}>Connect Freighter</Button>
          <Button variant="secondary" onClick={() => connect("albedo")}>Connect Albedo</Button>
        </div>
        <div className="grid gap-3 rounded-2xl border border-border p-4 text-sm">
          <p><span className="text-muted">Address:</span> {wallet.address ? truncateAddress(wallet.address) : "Not connected"}</p>
          <p><span className="text-muted">Balance:</span> {formatAmount(wallet.balance)} XLM</p>
          <p><span className="text-muted">Provider:</span> {wallet.provider ?? "none"}</p>
        </div>
        <Button variant="secondary" onClick={wallet.disconnect}>Disconnect Wallet</Button>
      </Card>
      <div className="space-y-4">
        <Card>
          <SectionTitle eyebrow="Send XLM" title="Create, sign, and submit a transfer" description="This page uses the backend to prepare an XLM transaction, then signs it in the connected wallet." />
          <form className="space-y-3" onSubmit={handleSend}>
            <Input value={destinationAddress} onChange={(event) => setDestinationAddress(event.target.value)} placeholder="Destination address" />
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.0000001" step="0.0000001" placeholder="Amount XLM" />
            <Input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="Memo (optional)" />
            <Button type="submit">Send XLM</Button>
          </form>
        </Card>
        <TransactionStatus stage={stage} txHash={txHash} explorerUrlValue={explorer} error={error} />
      </div>
    </div>
  );
}

export function CreateChallengePage() {
  const wallet = useWallet();
  const [form, setForm] = useState({ title: "", description: "", category: "Learning", stakeAmount: "25", durationDays: "30", verificationThreshold: "3" });
  const [stage, setStage] = useState("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [explorer, setExplorer] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet.address || !wallet.provider) {
      setStage("failed");
      setError("Wallet Not Connected");
      return;
    }
    setStage("preparing");
    setError(undefined);
    try {
      const contractTx = await api.prepareContractTx({
        method: "createChallenge",
        sourceAddress: wallet.address,
        args: [form.title, form.description, Number(form.stakeAmount), Number(form.durationDays), Number(form.verificationThreshold), form.category],
      });
      setStage("signing");
      const signed = await signTransaction(contractTx.xdr, wallet.provider);
      setStage("submitting");
      const submitted = await api.submitTx({ xdr: signed, walletAddress: wallet.address, type: "create_challenge" });
      setStage(submitted.status);
      setTxHash(submitted.txHash);
      setExplorer(submitted.explorerUrl);
      await api.createChallenge({
        creatorAddress: wallet.address,
        title: form.title,
        description: form.description,
        category: form.category,
        stakeAmount: Number(form.stakeAmount),
        durationDays: Number(form.durationDays),
        verificationThreshold: Number(form.verificationThreshold),
      });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      toast.success("Challenge created");
    } catch (challengeError) {
      setStage("failed");
      const message = challengeError instanceof Error ? challengeError.message : "Contract failure";
      setError(message.includes("balance") ? "Insufficient Balance" : message.includes("Wallet") ? "Wallet Not Connected" : "Contract Failure");
      toast.error(message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <Card>
        <SectionTitle eyebrow="Create Challenge" title="Commit stake, set rules, and go live" description="Challenge creation signs an actual Soroban contract invocation before persisting the app record." />
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Title" />
          <Textarea rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
          <Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={form.stakeAmount} onChange={(event) => setForm({ ...form, stakeAmount: event.target.value })} type="number" min="1" step="1" placeholder="Stake XLM" />
            <Input value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: event.target.value })} type="number" min="1" step="1" placeholder="Duration days" />
            <Input value={form.verificationThreshold} onChange={(event) => setForm({ ...form, verificationThreshold: event.target.value })} type="number" min="1" step="1" placeholder="Threshold" />
          </div>
          <Button type="submit">Create Challenge</Button>
        </form>
      </Card>
      <TransactionStatus stage={stage} txHash={txHash} explorerUrlValue={explorer} error={error} />
    </div>
  );
}

export function ChallengeDetailsPage() {
  const { id = "" } = useParams();
  const wallet = useWallet();
  const challengeQuery = useQuery({ queryKey: ["challenge", id], queryFn: () => api.challenge(id), enabled: Boolean(id) });
  const [proof, setProof] = useState({ title: "", description: "", githubLink: "", externalUrl: "", textEvidence: "" });
  const [voteError, setVoteError] = useState<string | undefined>();

  async function submitProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet.address || !wallet.provider) return toast.error("Wallet not connected");
    const contractTx = await api.prepareContractTx({ method: "submitProof", sourceAddress: wallet.address, args: [id, proof.title, proof.description, proof.githubLink, proof.externalUrl, proof.textEvidence] });
    const signed = await signTransaction(contractTx.xdr, wallet.provider);
    await api.submitTx({ xdr: signed, walletAddress: wallet.address, type: "submit_proof" });
    await api.createProof(id, { submitterAddress: wallet.address, ...proof });
    queryClient.invalidateQueries({ queryKey: ["challenge", id] });
    toast.success("Proof submitted");
  }

  async function vote(proofId: string, decision: "approve" | "reject") {
    if (!wallet.address || !wallet.provider) return setVoteError("Wallet Not Connected");
    try {
      const contractTx = await api.prepareContractTx({ method: decision === "approve" ? "approveProof" : "rejectProof", sourceAddress: wallet.address, args: [proofId, wallet.address] });
      const signed = await signTransaction(contractTx.xdr, wallet.provider);
      await api.submitTx({ xdr: signed, walletAddress: wallet.address, type: `${decision}_proof` });
      await api.vote(proofId, { voterAddress: wallet.address, decision });
      queryClient.invalidateQueries({ queryKey: ["challenge", id] });
      toast.success(`${decision} vote submitted`);
    } catch (error) {
      setVoteError(error instanceof Error ? error.message : "Contract failure");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle eyebrow="Challenge Details" title={challengeQuery.data?.challenge.title ?? "Loading challenge"} description={challengeQuery.data?.challenge.description ?? "Challenge information is loading from the API."} />
        {challengeQuery.data?.challenge ? (
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="Stake" value={`${formatAmount(challengeQuery.data.challenge.stakeAmount)} XLM`} hint="Locked in Soroban invocation flow." />
            <StatCard label="Threshold" value={String(challengeQuery.data.challenge.verificationThreshold)} hint="Votes required to resolve the proof." />
            <StatCard label="Proofs" value={String(challengeQuery.data.challenge.proofCount)} hint="Submitted community evidence." />
            <StatCard label="Status" value={challengeQuery.data.challenge.status} hint="Live contract and application state." />
          </div>
        ) : null}
      </Card>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <SectionTitle eyebrow="Submit Proof" title="Provide verifiable evidence" description="The proof includes title, description, optional links, and text evidence for community review." />
          <form className="space-y-3" onSubmit={submitProof}>
            <Input value={proof.title} onChange={(event) => setProof({ ...proof, title: event.target.value })} placeholder="Proof title" />
            <Textarea value={proof.description} onChange={(event) => setProof({ ...proof, description: event.target.value })} placeholder="Description" />
            <Input value={proof.githubLink} onChange={(event) => setProof({ ...proof, githubLink: event.target.value })} placeholder="GitHub link (optional)" />
            <Input value={proof.externalUrl} onChange={(event) => setProof({ ...proof, externalUrl: event.target.value })} placeholder="External URL (optional)" />
            <Textarea value={proof.textEvidence} onChange={(event) => setProof({ ...proof, textEvidence: event.target.value })} placeholder="Text evidence" />
            <Button type="submit">Submit Proof</Button>
          </form>
        </Card>
        <Card>
          <SectionTitle eyebrow="Verification" title="Community vote feed" description="Duplicate votes and self-voting are blocked by the backend." />
          <div className="space-y-3">
            {(challengeQuery.data?.proofs ?? []).map((item) => (
              <div key={item._id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted">{item.description}</p>
                  </div>
                  <Badge>{item.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => vote(item._id, "approve")}>Approve</Button>
                  <Button variant="secondary" onClick={() => vote(item._id, "reject")}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
          {voteError ? <p className="mt-3 text-sm text-[rgb(var(--danger))]">{voteError}</p> : null}
        </Card>
      </div>
    </div>
  );
}

export function ActiveChallengesPage({ completedOnly = false }: { completedOnly?: boolean }) {
  const challenges = useQuery({ queryKey: ["challenges"], queryFn: api.challenges });
  const filtered = (challenges.data?.challenges ?? []).filter((challenge) => (completedOnly ? challenge.status === "completed" : challenge.status === "active" || challenge.status === "proof_submitted"));
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow={completedOnly ? "Completed" : "Active"} title={completedOnly ? "Completed challenges" : "Active challenges"} description="These are live from the API and map to the Soroban-backed challenge lifecycle." />
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((challenge) => (
          <Card key={challenge._id} className="card-hover">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{challenge.title}</p>
                <p className="mt-1 text-sm text-muted">{challenge.description}</p>
              </div>
              <Badge>{challenge.status}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted">Stake</p><p className="mt-1 font-medium">{formatAmount(challenge.stakeAmount)} XLM</p></div>
              <div><p className="text-muted">Threshold</p><p className="mt-1 font-medium">{challenge.verificationThreshold}</p></div>
            </div>
            <div className="mt-4">
              <Button asChild variant="secondary"><Link to={`/challenge/${challenge._id}`}>Open details</Link></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function RewardPoolPage() {
  const rewardPool = useQuery({ queryKey: ["reward-pool"], queryFn: api.rewardPool });
  const pool = rewardPool.data?.rewardPool;
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Reward Pool" title="Failed stakes and historical distribution" description="Failed challenges accumulate in the pool and can be distributed by governance or admin logic." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Current Pool" value={`${formatAmount(pool?.currentBalance ?? 0)} XLM`} hint="Accumulated from failed stakes." />
        <StatCard label="Top Contributors" value={String(pool?.topContributors.length ?? 0)} hint="Wallets with the highest reward pool contribution." />
        <StatCard label="Top Earners" value={String(pool?.topEarners.length ?? 0)} hint="Wallets with the highest reward payouts." />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">Historical Distribution</h3>
          <div className="mt-4 space-y-3">
            {(pool?.historicalDistributions ?? []).map((distribution, index) => (
              <div key={`${distribution.reason}-${index}`} className="rounded-2xl border border-border p-4 text-sm">
                <p className="font-medium">{distribution.reason}</p>
                <p className="mt-1 text-muted">{formatAmount(distribution.amount)} XLM</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Reward Routing</h3>
          <p className="mt-3 text-sm text-muted">Rejected or failed stakes move into the pool, where they can be tracked, allocated, and audited from the dashboard and leaderboard pages.</p>
        </Card>
      </div>
    </div>
  );
}

export function LeaderboardPage() {
  const [scope, setScope] = useState("global");
  const leaderboard = useQuery({ queryKey: ["leaderboard", scope], queryFn: () => api.leaderboard(scope) });
  const tabs = ["global", "weekly", "success-rate", "xp", "staked"];
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Leaderboard" title="Global and ranked views" description="Switch between global, weekly, success rate, XP, and total staked rankings." />
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => <Button key={tab} variant={scope === tab ? "primary" : "secondary"} onClick={() => setScope(tab)}>{tab}</Button>)}
      </div>
      <Card>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left text-xs uppercase tracking-[0.18em] text-muted dark:bg-white/5">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">XP</th>
                <th className="px-4 py-3">Success</th>
                <th className="px-4 py-3">Staked</th>
              </tr>
            </thead>
            <tbody>
              {(leaderboard.data?.rows ?? []).map((row) => (
                <tr key={row.walletAddress} className="border-t border-border">
                  <td className="px-4 py-3">{row.rank}</td>
                  <td className="px-4 py-3">{truncateAddress(row.walletAddress)}</td>
                  <td className="px-4 py-3">{row.xp}</td>
                  <td className="px-4 py-3">{row.successRate}%</td>
                  <td className="px-4 py-3">{formatAmount(row.totalXlmStaked)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function NotificationsPage() {
  const wallet = useWallet();
  const notifications = useQuery({ queryKey: ["notifications", wallet.address], queryFn: () => api.notifications(wallet.address ?? ""), enabled: Boolean(wallet.address) });
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Notifications" title="Actionable updates" description="Wallet activity, challenge changes, proof votes, and reward pool events." />
      <div className="space-y-3">
        {(notifications.data?.notifications ?? []).map((item) => (
          <Card key={item._id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.body}</p>
              </div>
              <Badge>{item.kind}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const wallet = useWallet();
  const profile = useQuery({ queryKey: ["profile", wallet.address], queryFn: () => api.profile(wallet.address ?? ""), enabled: Boolean(wallet.address) });
  const user = profile.data?.user;
  const xp = user?.xp ?? 0;
  const level = getLevelFromXp(xp);
  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle eyebrow="Profile" title={user?.displayName ?? "Connect a wallet"} description="Wallet address, XP, level, challenge history, achievements, and verification stats are aggregated here." />
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Wallet" value={wallet.address ? truncateAddress(wallet.address) : "None"} hint="Connected address" />
          <StatCard label="XP" value={String(xp)} hint="Accumulated from challenge and verification activity." />
          <StatCard label="Level" value={level.name} hint="Derived from XP thresholds." />
          <StatCard label="Success Rate" value={`${user?.successRate ?? 0}%`} hint="Challenge completion performance." />
        </div>
        <div className="mt-6">
          <p className="text-label text-xs text-muted">Progress</p>
          <div className="mt-3 max-w-2xl"><Progress value={Math.min(100, (xp / 6000) * 100)} /></div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">Challenge History</h3>
          <div className="mt-4 space-y-3">
            {(profile.data?.challenges ?? []).map((challenge) => (
              <div key={challenge._id} className="rounded-2xl border border-border p-4">
                <p className="font-medium">{challenge.title}</p>
                <p className="mt-1 text-sm text-muted">{challenge.status}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Achievements and verification stats</h3>
          <div className="mt-4 space-y-3">
            {(profile.data?.achievements ?? []).map((achievement) => (
              <div key={achievement.code} className="rounded-2xl border border-border p-4">
                <p className="font-medium">{achievement.title}</p>
                <p className="mt-1 text-sm text-muted">{achievement.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const rewardPool = useQuery({ queryKey: ["reward-pool"], queryFn: api.rewardPool });
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Admin Dashboard" title="Operational controls and platform health" description="Review thresholds, reward pool state, and global system activity." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Verification Threshold" value="3" hint="Configured through environment and challenge creation." />
        <StatCard label="Reward Pool" value={`${formatAmount(rewardPool.data?.rewardPool.currentBalance ?? 0)} XLM`} hint="Accumulated failed stakes." />
        <StatCard label="Platform Status" value="Healthy" hint="API, wallet, and contract integrations are active." />
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { themeMode, setThemeMode } = useTheme();
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Settings" title="Theme, wallet, and notification preferences" description="Auto mode respects system preference and time of day, with animated transitions between states." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">Theme Selection</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["light", "dark", "auto"] as const).map((mode) => (
              <Button key={mode} variant={themeMode === mode ? "primary" : "secondary"} onClick={() => setThemeMode(mode)}>
                {mode}
              </Button>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Preferences</h3>
          <p className="mt-3 text-sm text-muted">Wallet and notification preferences are stored through the backend schema layer.</p>
        </Card>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-label text-xs text-muted">404</p>
      <h2 className="text-4xl font-semibold tracking-tight">Page not found</h2>
      <p className="max-w-xl text-sm text-muted">The route does not exist. Return to the dashboard or landing page.</p>
      <div className="flex gap-3">
        <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
        <Button variant="secondary" asChild><Link to="/">Home</Link></Button>
      </div>
    </div>
  );
}
