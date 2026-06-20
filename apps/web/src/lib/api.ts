export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(payload.message ?? response.statusText);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean; rewardPoolBalance: number }>("/health"),
  network: () => request<{ passphrase: string; rpcUrl: string; horizonUrl: string; explorerBase: string; contractId: string }>("/api/network"),
  balance: (address: string) => request<{ address: string; balance: number; user?: unknown }>(`/api/wallet/${address}/balance`),
  challenges: () => request<{ challenges: ChallengeSummary[] }>("/api/challenges"),
  challenge: (id: string) => request<{ challenge: ChallengeDetail; proofs: ProofSummary[] }>(`/api/challenges/${id}`),
  createChallenge: (body: Record<string, unknown>) => request<{ challenge: ChallengeSummary }>("/api/challenges", { method: "POST", body: JSON.stringify(body) }),
  createProof: (challengeId: string, body: Record<string, unknown>) => request<{ proof: ProofSummary }>(`/api/challenges/${challengeId}/proofs`, { method: "POST", body: JSON.stringify(body) }),
  vote: (proofId: string, body: Record<string, unknown>) => request<{ vote: unknown; challenge: ChallengeSummary; proof: ProofSummary }>(`/api/proofs/${proofId}/votes`, { method: "POST", body: JSON.stringify(body) }),
  rewardPool: () => request<{ rewardPool: RewardPoolSummary }>("/api/reward-pool"),
  leaderboard: (scope: string) => request<{ scope: string; rows: LeaderboardRow[] }>(`/api/leaderboard/${scope}`),
  profile: (address: string) => request<{ user?: UserProfile; challenges: ChallengeSummary[]; achievements: AchievementSummary[]; proofs: ProofSummary[] }>(`/api/profile/${address}`),
  notifications: (address: string) => request<{ notifications: NotificationSummary[] }>(`/api/notifications/${address}`),
  activities: () => request<{ activities: ActivitySummary[]; contractEvents: unknown[] }>("/api/activities"),
  sendXlmPrepare: (body: Record<string, unknown>) => request<{ transactionId: string; xdr: string }>("/api/transactions/send-xlm/prepare", { method: "POST", body: JSON.stringify(body) }),
  submitTx: (body: Record<string, unknown>) => request<{ status: string; txHash: string; explorerUrl: string }>("/api/transactions/submit", { method: "POST", body: JSON.stringify(body) }),
  prepareContractTx: (body: Record<string, unknown>) => request<{ xdr: string }>("/api/contracts/prepare", { method: "POST", body: JSON.stringify(body) }),
};

export interface ChallengeSummary {
  _id: string;
  creatorAddress: string;
  title: string;
  description: string;
  category: string;
  stakeAmount: number;
  durationDays: number;
  verificationThreshold: number;
  status: string;
  proofCount: number;
  approvedVotes: number;
  rejectedVotes: number;
  createdAt: string;
}

export interface ChallengeDetail extends ChallengeSummary {}

export interface ProofSummary {
  _id: string;
  challengeId: string;
  submitterAddress: string;
  title: string;
  description: string;
  githubLink: string;
  externalUrl: string;
  textEvidence: string;
  status: string;
  voteCount: number;
  createdAt: string;
}

export interface RewardPoolSummary {
  currentBalance: number;
  historicalDistributions: Array<{ amount: number; reason: string; distributedAt: string }>;
  topContributors: Array<{ walletAddress: string; amount: number }>;
  topEarners: Array<{ walletAddress: string; amount: number }>;
}

export interface LeaderboardRow {
  walletAddress: string;
  displayName: string;
  xp: number;
  successRate: number;
  totalXlmStaked: number;
  rank: number;
}

export interface UserProfile {
  walletAddress: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  xp: number;
  level: string;
  totalXlmStaked: number;
  successRate: number;
  streakDays: number;
}

export interface AchievementSummary {
  code: string;
  title: string;
  description: string;
  xpReward: number;
}

export interface NotificationSummary {
  _id: string;
  title: string;
  body: string;
  kind: string;
  createdAt: string;
}

export interface ActivitySummary {
  _id: string;
  kind: string;
  actorAddress: string;
  message: string;
  createdAt: string;
}
