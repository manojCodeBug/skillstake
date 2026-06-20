import mongoose from "mongoose";
import { env } from "./config";
import { createApp } from "./app";
import { RewardPool } from "./models";

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established successfully");
});

mongoose.connection.on("error", (err) => {
  console.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection disconnected");
});

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(env.MONGODB_URI);
  
  // Initialize RewardPool only if it doesn't exist, preventing reset on scale/restart
  await RewardPool.findOneAndUpdate(
    {},
    { $setOnInsert: { currentBalance: 0, historicalDistributions: [], topContributors: [], topEarners: [] } },
    { upsert: true, new: true }
  );

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`SkillStake API listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log("HTTP server closed.");
      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
        process.exit(0);
      } catch (err) {
        console.error("Error during MongoDB disconnection:", err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error("Forcing shutdown after timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("Critical server startup failure:", error);
  process.exit(1);
});
