import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  ALLOWED_ORIGIN: z.string().min(1).default("*"),
  VITE_HORIZON_URL: z.string().url().default("https://horizon-testnet.stellar.org"),
  VITE_SOROBAN_RPC_URL: z.string().url().default("https://soroban-testnet.stellar.org"),
  VITE_STELLAR_NETWORK_PASSPHRASE: z.string().min(1).default("Test SDF Network ; September 2015"),
  VITE_STELLAR_EXPLORER_BASE: z.string().url().default("https://stellar.expert/explorer/testnet/tx"),
  VITE_CONTRACT_ID: z.string().min(1).default("CD5G2C37K3A6I5C2WBLJNZFLF6U6K3W6Z2Q2R2E5J4D5J4D5J4D5J4D5"),
  VERIFICATION_THRESHOLD: z.coerce.number().int().min(1).max(25).default(3),
  REWARD_POOL_TREASURY_ADDRESS: z.string().min(1).default("GBD5G2C37K3A6I5C2WBLJNZFLF6U6K3W6Z2Q2R2E5J4D5J4D5J4D5J4D5"),
  ADMIN_WALLET_ADDRESS: z.string().min(1).default("GBD5G2C37K3A6I5C2WBLJNZFLF6U6K3W6Z2Q2R2E5J4D5J4D5J4D5J4D5"),
  SCHEDULER_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(15000),
});

export const env = envSchema.parse(process.env);
