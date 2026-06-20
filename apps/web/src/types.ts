export type ThemeMode = "light" | "dark" | "auto";

export type WalletProvider = "freighter" | "albedo" | "manual";

export type TransactionStage =
  | "idle"
  | "preparing"
  | "signing"
  | "submitting"
  | "pending"
  | "success"
  | "failed";

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
