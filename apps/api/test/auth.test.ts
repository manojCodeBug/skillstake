import "./setup";
import mongoose from "mongoose";
import request from "supertest";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { Nonce, User, Challenge, Proof } from "../src/models";
import jwt from "jsonwebtoken";

// Mock Stellar-related services to isolate testing to routes & authentication logic
vi.mock("../src/services", () => {
  return {
    buildAuthTransaction: vi.fn().mockResolvedValue("mock-xdr-auth-transaction"),
    verifyTransactionSignature: vi.fn().mockResolvedValue(true),
    fetchXlmBalance: vi.fn().mockResolvedValue(1250),
    stellarSdk: vi.fn(),
  };
});

describe("Authentication & Route Authorization Guards", () => {
  let app: any;
  const mockWallet = "GBD5G2C37K3A6I5C2WBLJNZFLF6U6K3W6Z2Q2R2E5J4D5J4D5J4D5J4D5";
  const mockSpooderWallet = "GBD5G2C37K3A6I5C2WBLJNZFLF6U6K3W6Z2Q2R2E5J4D5J4D5J4D5J4D9";

  beforeAll(async () => {
    app = createApp();
    try {
      // Connect to test database if MongoDB is running locally
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/skillstake-test", {
          serverSelectionTimeoutMS: 2000,
        });
      }
    } catch (err: any) {
      console.warn("MongoDB test connection failed. Skipping database route integration assertions:", err.message);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await Nonce.deleteMany({});
      await User.deleteMany({});
      await Challenge.deleteMany({});
      await Proof.deleteMany({});
      await mongoose.connection.close();
    }
  });

  it("GET /api/auth/nonce - generates a nonce and returns signable XDR", async () => {
    if (mongoose.connection.readyState === 0) return; // skip if DB is offline
    
    const res = await request(app)
      .get(`/api/auth/nonce?address=${mockWallet}`)
      .expect(200);

    expect(res.body.nonce).toBeTruthy();
    expect(res.body.xdr).toBe("mock-xdr-auth-transaction");

    const record = await Nonce.findOne({ walletAddress: mockWallet });
    expect(record).toBeTruthy();
    expect(record?.nonce).toBe(res.body.nonce);
  });

  it("POST /api/auth/verify - rejects verification if no active nonce challenge exists", async () => {
    if (mongoose.connection.readyState === 0) return;

    await request(app)
      .post("/api/auth/verify")
      .send({ walletAddress: mockSpooderWallet, signedXdr: "signed-xdr-envelope" })
      .expect(401);
  });

  it("POST /api/auth/verify - verifies transaction signature, deletes nonce, and returns JWT session", async () => {
    if (mongoose.connection.readyState === 0) return;

    // 1. Generate nonce
    const nonceRes = await request(app)
      .get(`/api/auth/nonce?address=${mockWallet}`)
      .expect(200);

    // 2. Verify signature
    const verifyRes = await request(app)
      .post("/api/auth/verify")
      .send({ walletAddress: mockWallet, signedXdr: "signed-xdr-envelope" })
      .expect(200);

    expect(verifyRes.body.token).toBeTruthy();
    expect(verifyRes.body.walletAddress).toBe(mockWallet);

    // Nonce should be cleared to prevent replay attacks
    const record = await Nonce.findOne({ walletAddress: mockWallet });
    expect(record).toBeNull();
  });

  it("Protected Routes - rejects requests without Authorization header with 401", async () => {
    await request(app)
      .post("/api/challenges")
      .send({ creatorAddress: mockWallet })
      .expect(401);
  });

  it("Protected Routes - rejects spoofed wallet request with 403 Forbidden", async () => {
    if (mongoose.connection.readyState === 0) return;

    // Generate token for mockWallet
    const token = jwt.sign({ walletAddress: mockWallet }, process.env.JWT_SECRET || "test-secret-test-secret");

    // Send payload with spoofed address
    await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${token}`)
      .send({
        creatorAddress: mockSpooderWallet,
        title: "30 Days of DSA",
        description: "Complete thirty days of data structures and algorithms practice.",
        category: "Learning",
        stakeAmount: 100,
        durationDays: 30,
        verificationThreshold: 3,
      })
      .expect(403);
  });
});
