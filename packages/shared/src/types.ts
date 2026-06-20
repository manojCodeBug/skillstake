import type { z } from "zod";
import type {
  challengeCreateSchema,
  proofSubmissionSchema,
  sendXlmSchema,
  settingsSchema,
  txStatusSchema,
  voteSchema,
} from "./schemas";

export type ChallengeCreateInput = z.infer<typeof challengeCreateSchema>;
export type ProofSubmissionInput = z.infer<typeof proofSubmissionSchema>;
export type SendXlmInput = z.infer<typeof sendXlmSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type TxStatus = z.infer<typeof txStatusSchema>;

export type ThemeMode = "light" | "dark" | "auto";

export type ActivityKind =
  | "user_created_challenge"
  | "user_submitted_proof"
  | "community_approved_proof"
  | "community_rejected_proof"
  | "challenge_completed"
  | "challenge_failed"
  | "stake_returned"
  | "stake_sent_to_reward_pool"
  | "reward_pool_distributed";

export type LevelName =
  | "Beginner"
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond";
