import mongoose from "mongoose";
import { env } from "./config";
import { createApp } from "./app";
import { RewardPool } from "./models";
import { startEventProcessor } from "./eventProcessor";
import { MongoMemoryServer } from "mongodb-memory-server";
import net from "net";

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established successfully");
});

mongoose.connection.on("error", (err) => {
  console.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection disconnected");
});

function checkMongoPort(port: number = 27017, host: string = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`SkillStake API listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  let mongoServer: MongoMemoryServer | null = null;

  const connectWithRetry = async () => {
    console.log("Connecting to MongoDB in the background...");
    let targetUri = env.MONGODB_URI;

    // Check if target points to a local instance and it is offline
    if (targetUri.includes("localhost") || targetUri.includes("127.0.0.1")) {
      const isRunning = await checkMongoPort();
      if (!isRunning) {
        console.log("Local MongoDB is offline. Spinning up an in-memory database automatically...");
        try {
          if (!mongoServer) {
            mongoServer = await MongoMemoryServer.create();
          }
          targetUri = mongoServer.getUri();
          console.log(`In-memory MongoDB started at: ${targetUri}`);
        } catch (memErr) {
          console.error("Failed to start MongoMemoryServer:", memErr);
        }
      } else {
        console.log("Local MongoDB is active. Connecting...");
      }
    }

    mongoose.connect(targetUri)
      .then(async () => {
        console.log("MongoDB connection established successfully.");
        
        // Initialize RewardPool only if it doesn't exist, preventing reset on scale/restart
        await RewardPool.findOneAndUpdate(
          {},
          { $setOnInsert: { currentBalance: 0, historicalDistributions: [], topContributors: [], topEarners: [] } },
          { upsert: true, new: true }
        ).catch((err) => console.error("Error initializing RewardPool:", err));

        // Start background on-chain event processor
        await startEventProcessor().catch((err) => console.error("Error starting event processor:", err));
      })
      .catch((error) => {
        console.error("MongoDB connection failed! Retrying in 5 seconds... Error:", error.message);
        setTimeout(connectWithRetry, 5000);
      });
  };

  connectWithRetry();

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log("HTTP server closed.");
      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
        if (mongoServer) {
          await mongoServer.stop();
          console.log("In-memory MongoDB stopped.");
        }
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
