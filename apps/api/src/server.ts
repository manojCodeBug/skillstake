import mongoose from "mongoose";
import { env } from "./config";
import { createApp } from "./app";
import { RewardPool } from "./models";

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  await RewardPool.findOneAndUpdate({}, { currentBalance: 0, historicalDistributions: [], topContributors: [], topEarners: [] }, { upsert: true, new: true });

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`SkillStake API listening on ${env.PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
