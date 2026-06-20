export const NETWORKS = {
  mainnet: {
    name: "Public",
    passphrase: "Public Global Stellar Network ; September 2015",
  },
  testnet: {
    name: "Testnet",
    passphrase: "Test SDF Network ; September 2015",
  },
} as const;

export const XP_LEVELS = [
  { name: "Beginner", minXp: 0, color: "neutral" },
  { name: "Bronze", minXp: 250, color: "neutral" },
  { name: "Silver", minXp: 750, color: "neutral" },
  { name: "Gold", minXp: 1500, color: "neutral" },
  { name: "Platinum", minXp: 3000, color: "neutral" },
  { name: "Diamond", minXp: 6000, color: "neutral" },
] as const;

export const CHALLENGE_STATUSES = [
  "draft",
  "active",
  "proof_submitted",
  "approved",
  "rejected",
  "completed",
  "failed",
  "cancelled",
] as const;

export const VOTE_DECISIONS = ["approve", "reject"] as const;
