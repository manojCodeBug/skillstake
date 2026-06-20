process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/skillstake-test";
process.env.JWT_SECRET = "test-secret-test-secret";
process.env.ALLOWED_ORIGIN = "http://localhost:5173";
process.env.VITE_HORIZON_URL = "https://horizon.stellar.org";
process.env.VITE_SOROBAN_RPC_URL = "https://soroban-rpc.stellar.org";
process.env.VITE_STELLAR_NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015";
process.env.VITE_STELLAR_EXPLORER_BASE = "https://stellar.expert/explorer/public/tx";
process.env.VITE_CONTRACT_ID = "CONTRACT_ID";
process.env.ADMIN_WALLET_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
process.env.REWARD_POOL_TREASURY_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export {};
