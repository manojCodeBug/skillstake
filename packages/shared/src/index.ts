export * from "./constants";
export * from "./schemas";
export * from "./types";

export function formatXlmAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getLevelFromXp(xp: number) {
  const levels = [
    { name: "Beginner", minXp: 0 },
    { name: "Bronze", minXp: 250 },
    { name: "Silver", minXp: 750 },
    { name: "Gold", minXp: 1500 },
    { name: "Platinum", minXp: 3000 },
    { name: "Diamond", minXp: 6000 },
  ] as const;

  return [...levels].reverse().find((level) => xp >= level.minXp) ?? levels[0];
}

export function calculateXpForChallengeCompletion(stakeAmount: number, proofCount: number) {
  return Math.round(stakeAmount / 1000) + proofCount * 50 + 250;
}

export function calculateXpForVerificationVote(decision: "approve" | "reject") {
  return decision === "approve" ? 25 : 15;
}
