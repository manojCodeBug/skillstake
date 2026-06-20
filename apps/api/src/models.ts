import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { CHALLENGE_STATUSES, VOTE_DECISIONS } from "@skillstake/shared";

const walletAddress = {
  type: String,
  required: true,
  index: true,
  trim: true,
};

const userSchema = new Schema(
  {
    walletAddress: { ...walletAddress, unique: true },
    displayName: { type: String, trim: true, default: "Anonymous" },
    bio: { type: String, trim: true, default: "" },
    avatarUrl: { type: String, trim: true, default: "" },
    xp: { type: Number, min: 0, default: 0 },
    level: { type: String, default: "Beginner" },
    totalXlmStaked: { type: Number, min: 0, default: 0 },
    successRate: { type: Number, min: 0, max: 100, default: 0 },
    streakDays: { type: Number, min: 0, default: 0 },
    settings: {
      themeMode: { type: String, enum: ["light", "dark", "auto"], default: "auto" },
      notificationPreferences: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      walletPreferences: {
        preferredWallet: { type: String, enum: ["freighter", "albedo", "auto"], default: "auto" },
      },
    },
  },
  { timestamps: true },
);

userSchema.index({ xp: -1, successRate: -1 });

const challengeSchema = new Schema(
  {
    creatorAddress: walletAddress,
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    stakeAmount: { type: Number, required: true, min: 1 },
    durationDays: { type: Number, required: true, min: 1, max: 365 },
    verificationThreshold: { type: Number, required: true, min: 1, max: 25 },
    status: { type: String, enum: CHALLENGE_STATUSES, default: "active", index: true },
    proofCount: { type: Number, default: 0, min: 0 },
    approvedVotes: { type: Number, default: 0, min: 0 },
    rejectedVotes: { type: Number, default: 0, min: 0 },
    rewardPoolLocked: { type: Boolean, default: false },
    contractId: { type: String, trim: true, default: "" },
    txHash: { type: String, trim: true, default: "" },
    completionTxHash: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

challengeSchema.index({ creatorAddress: 1, createdAt: -1 });
challengeSchema.index({ status: 1, createdAt: -1 });

const proofSchema = new Schema(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: "Challenge", required: true, index: true },
    submitterAddress: walletAddress,
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 4000 },
    githubLink: { type: String, trim: true, default: "" },
    externalUrl: { type: String, trim: true, default: "" },
    textEvidence: { type: String, required: true, trim: true, minlength: 10, maxlength: 4000 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    txHash: { type: String, trim: true, default: "" },
    voteCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

proofSchema.index({ challengeId: 1, createdAt: -1 });

const voteSchema = new Schema(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: "Challenge", required: true, index: true },
    proofId: { type: Schema.Types.ObjectId, ref: "Proof", required: true, index: true },
    voterAddress: walletAddress,
    decision: { type: String, enum: VOTE_DECISIONS, required: true },
    txHash: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

voteSchema.index({ proofId: 1, voterAddress: 1 }, { unique: true });

const rewardPoolSchema = new Schema(
  {
    currentBalance: { type: Number, min: 0, default: 0 },
    historicalDistributions: [
      {
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        distributedAt: { type: Date, default: Date.now },
      },
    ],
    topContributors: [
      {
        walletAddress: walletAddress,
        amount: { type: Number, required: true },
      },
    ],
    topEarners: [
      {
        walletAddress: walletAddress,
        amount: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

const transactionSchema = new Schema(
  {
    walletAddress: walletAddress,
    type: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: ["preparing", "signing", "submitting", "pending", "success", "failed"] },
    txHash: { type: String, trim: true, default: "" },
    xdr: { type: String, trim: true, default: "" },
    explorerUrl: { type: String, trim: true, default: "" },
    errorMessage: { type: String, trim: true, default: "" },
    network: { type: String, required: true },
  },
  { timestamps: true },
);

const notificationSchema = new Schema(
  {
    walletAddress: walletAddress,
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    kind: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
    link: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

const activitySchema = new Schema(
  {
    kind: { type: String, required: true, trim: true, index: true },
    actorAddress: { type: String, trim: true, default: "" },
    challengeId: { type: Schema.Types.ObjectId, ref: "Challenge", default: null },
    proofId: { type: Schema.Types.ObjectId, ref: "Proof", default: null },
    txHash: { type: String, trim: true, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 240 },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const achievementSchema = new Schema(
  {
    walletAddress: walletAddress,
    code: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    xpReward: { type: Number, required: true, min: 0 },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const leaderboardSnapshotSchema = new Schema(
  {
    scope: { type: String, required: true, enum: ["global", "weekly", "success-rate", "xp", "staked"] },
    generatedAt: { type: Date, default: Date.now },
    rows: [
      {
        walletAddress: walletAddress,
        displayName: { type: String, required: true },
        xp: { type: Number, default: 0 },
        successRate: { type: Number, default: 0 },
        totalXlmStaked: { type: Number, default: 0 },
        rank: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
export const Challenge = mongoose.model("Challenge", challengeSchema);
export const Proof = mongoose.model("Proof", proofSchema);
export const Vote = mongoose.model("Vote", voteSchema);
export const RewardPool = mongoose.model("RewardPool", rewardPoolSchema);
export const Transaction = mongoose.model("Transaction", transactionSchema);
export const Notification = mongoose.model("Notification", notificationSchema);
export const Activity = mongoose.model("Activity", activitySchema);
export const Achievement = mongoose.model("Achievement", achievementSchema);
export const LeaderboardSnapshot = mongoose.model("LeaderboardSnapshot", leaderboardSnapshotSchema);

const nonceSchema = new Schema(
  {
    walletAddress: { type: String, required: true, index: true, trim: true, unique: true },
    nonce: { type: String, required: true },
  },
  { timestamps: true }
);

// TTL index to automatically expire nonce documents after 5 minutes (300 seconds)
nonceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

export const Nonce = mongoose.model("Nonce", nonceSchema);

export type UserDoc = InferSchemaType<typeof userSchema>;
export type ChallengeDoc = InferSchemaType<typeof challengeSchema>;
export type ProofDoc = InferSchemaType<typeof proofSchema>;
export type VoteDoc = InferSchemaType<typeof voteSchema>;
export type RewardPoolDoc = InferSchemaType<typeof rewardPoolSchema>;
export type TransactionDoc = InferSchemaType<typeof transactionSchema>;
export type NotificationDoc = InferSchemaType<typeof notificationSchema>;
export type ActivityDoc = InferSchemaType<typeof activitySchema>;
export type AchievementDoc = InferSchemaType<typeof achievementSchema>;
export type LeaderboardSnapshotDoc = InferSchemaType<typeof leaderboardSnapshotSchema>;
export type NonceDoc = InferSchemaType<typeof nonceSchema>;

const systemStateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
);

export const SystemState = mongoose.model("SystemState", systemStateSchema);
export type SystemStateDoc = InferSchemaType<typeof systemStateSchema>;
