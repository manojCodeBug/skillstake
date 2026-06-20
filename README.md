# SkillStake

SkillStake is a production-oriented Stellar accountability platform for staking XLM against personal challenges.

## What is included

- React + Vite + TypeScript frontend
- Express + TypeScript backend
- MongoDB/Mongoose data model layer
- Stellar + Soroban transaction helpers
- Freighter and Albedo wallet integration
- Contract-call preparation and transaction submission flow
- Activity feed, leaderboard, reward pool, profile, settings, admin, and challenge screens
- Vitest unit coverage and Playwright end-to-end checks
- GitHub Actions CI

## Setup

1. Copy `.env.example` to `.env` and fill in the values.
2. Install dependencies with `npm install`.
3. Run the backend with `npm run dev:api`.
4. Run the frontend with `npm run dev:web`.

## Deployment

### Frontend on Vercel

1. Set the project root to `apps/web`.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Provide the frontend environment variables from `.env.example`.

### Backend on Railway

1. Set the project root to `apps/api`.
2. Set the build command to `npm run build`.
3. Set the start command to `npm run start`.
4. Attach a MongoDB Atlas database and populate the backend environment variables.

### Soroban contract deployment

1. Build the contract from `contracts/skillstake-contract`.
2. Deploy it to the Stellar network configured in your environment.
3. Copy the deployed contract ID into `VITE_CONTRACT_ID`.
4. Update the API and frontend environment files with the deployed RPC and explorer endpoints.

### Database

1. Create a MongoDB Atlas cluster.
2. Add the connection string to `MONGODB_URI`.
3. Ensure the database user has read and write access to the SkillStake database.

## Scripts

- `npm run dev:web`
- `npm run dev:api`
- `npm run build`
- `npm run test`
- `npm run lint`
- `npm run typecheck`

## Notes

- The Soroban contract package is included under `contracts/skillstake-contract`.
- The app expects a deployed contract ID and a configured Soroban RPC endpoint.
- Wallet actions depend on Freighter or Albedo being available in the browser.
- The backend expects MongoDB Atlas to be reachable before startup.
- The activity feed streams from the API and reflects challenge lifecycle updates.
