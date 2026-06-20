import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  ALLOWED_ORIGIN: z.string().url(),
  VITE_HORIZON_URL: z.string().url(),
  VITE_SOROBAN_RPC_URL: z.string().url(),
  VITE_STELLAR_NETWORK_PASSPHRASE: z.string().min(1),
  VITE_STELLAR_EXPLORER_BASE: z.string().url(),
  VITE_CONTRACT_ID: z.string().min(1),
  VERIFICATION_THRESHOLD: z.coerce.number().int().min(1).max(25).default(3),
  REWARD_POOL_TREASURY_ADDRESS: z.string().min(1),
  ADMIN_WALLET_ADDRESS: z.string().min(1),
  SCHEDULER_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(15000),
});

export const env = envSchema.parse(process.env);
