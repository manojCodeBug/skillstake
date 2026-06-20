import { z } from "zod";

export const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar public key");

export const networkSchema = z.enum(["mainnet", "testnet"]);

export const challengeCreateSchema = z.object({
  creatorAddress: walletAddressSchema,
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(60),
  stakeAmount: z.number().positive().max(10_000_000),
  durationDays: z.number().int().min(1).max(365),
  verificationThreshold: z.number().int().min(1).max(25).default(3),
});

export const proofSubmissionSchema = z.object({
  challengeId: z.string().trim().min(1),
  submitterAddress: walletAddressSchema,
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(4000),
  githubLink: z.string().trim().url().optional().or(z.literal("")),
  externalUrl: z.string().trim().url().optional().or(z.literal("")),
  textEvidence: z.string().trim().min(10).max(4000),
});

export const voteSchema = z.object({
  proofId: z.string().trim().min(1),
  voterAddress: walletAddressSchema,
  decision: z.enum(["approve", "reject"]),
});

export const txStatusSchema = z.enum([
  "preparing",
  "signing",
  "submitting",
  "pending",
  "success",
  "failed",
]);

export const sendXlmSchema = z.object({
  sourceAddress: walletAddressSchema,
  destinationAddress: walletAddressSchema,
  amount: z.number().positive().max(10_000_000),
  memo: z.string().trim().max(28).optional(),
});

export const settingsSchema = z.object({
  themeMode: z.enum(["light", "dark", "auto"]),
  notificationPreferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean(),
  }),
  walletPreferences: z.object({
    preferredWallet: z.enum(["freighter", "albedo", "auto"]),
  }),
});
