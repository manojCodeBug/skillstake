# SkillStake 🚀

SkillStake is a decentralized accountability platform built on Stellar and Soroban. Users lock XLM into a smart contract when committing to personal challenges (e.g., completa 30 Days of DSA, Fitness Challenges, etc.). The stake is returned if community verifications approve the submitted proof, otherwise the funds are redirected to a community reward pool.

---

## 🏗️ Monorepo Structure

*   **`apps/web`**: React SPA built with Vite, TypeScript, and TailwindCSS. Uses `@stellar/freighter-api` for Web3 integrations.
*   **`apps/api`**: Express.js REST API with mongoose schemas, request validation, centralized error handling, and robust CORS configuration.
*   **`packages/shared`**: Shared TypeScript validation schemas, constants, and XP helper methods.
*   **`contracts/skillstake-contract`**: Rust-based Soroban Smart Contract implementation.

---

## 🛠️ Local Development Setup

1.  **Clone & Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Environment Variables**:
    *   Copy `.env.example` to `.env` in the root (or set individual variables in each app).
3.  **Run Services**:
    *   **Backend**: `npm run dev:api`
    *   **Frontend**: `npm run dev:web`

---

## ⚡ Available Monorepo Scripts

*   `npm run dev:web` — Run React frontend locally.
*   `npm run dev:api` — Run Express backend locally.
*   `npm run build` — Build all workspaces for production.
*   `npm run test` — Run vitest unit/integration tests across all packages.
*   `npm run lint` — Validate code compliance via TypeScript compilation checks.
*   `npm run typecheck` — Perform complete TypeScript type checks across workspaces.

---

## 🚀 Production Deployment

### 1. Database (MongoDB Atlas)
*   Create a MongoDB Atlas cluster.
*   Add the MongoDB connection string to your environment variable as `MONGODB_URI`.

### 2. Backend API on Railway
*   Configure the repository source.
*   **Root Directory**: Set to `apps/api` (or keep root and run build command from root).
*   **Build Command**: `npm run build`
*   **Start Command**: `npm run start`
*   Add all environment variables from `.env.example` (excluding the VITE prefix variables, or keep them to serve frontend variables).

### 3. Frontend on Vercel
*   Import the repository.
*   **Root Directory**: Set to `apps/web`.
*   **Build Command**: `npm run build`
*   **Output Directory**: `dist`
*   Add all frontend variables prefixed with `VITE_` (e.g., `VITE_API_URL` pointing to your deployed Railway backend).
*   *Note: SPA redirection routing is handled automatically in production via the included `apps/web/vercel.json`.*
