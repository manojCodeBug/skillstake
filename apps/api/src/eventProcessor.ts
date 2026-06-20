import { scValToNative } from "@stellar/stellar-sdk";
import { fetchContractEvents } from "./services";
import { SystemState, Challenge, Proof, Vote } from "./models";

let isPolling = false;

export async function startEventProcessor() {
  console.log("Starting background event processor...");
  
  // Run polling cycle periodically
  setInterval(async () => {
    if (isPolling) return;
    isPolling = true;
    try {
      await pollAndProcessEvents();
    } catch (err) {
      console.error("Error in event processor poll loop:", err);
    } finally {
      isPolling = false;
    }
  }, 10000);
}

async function pollAndProcessEvents() {
  const stateRecord = await SystemState.findOne({ key: "last_processed_event_cursor" });
  let cursor = stateRecord?.value;

  // Retrieve events chronologically (oldest first) to preserve state order
  const events = await fetchContractEvents(cursor, "asc");
  if (!events || events.length === 0) return;

  console.log(`Fetched ${events.length} new Soroban events to process.`);

  for (const event of events) {
    try {
      const topics = event.topic.map((t: any) => scValToNative(t));
      const value = scValToNative(event.value);
      const eventType = topics[0];

      console.log(`Processing on-chain event: ${eventType}`, topics, value);

      if (eventType === "challenge_created") {
        const onChainId = topics[1];
        const creatorAddress = value;
        
        // Mark the challenge as active in DB
        const challenge = await Challenge.findOneAndUpdate(
          { creatorAddress, contractId: "" },
          { contractId: String(onChainId), status: "active" },
          { new: true }
        );
        if (challenge) {
          console.log(`Updated challenge ${challenge._id} with on-chain ID ${onChainId}`);
        }
      } else if (eventType === "proof_submitted") {
        const onChainProofId = topics[1];
        const submitterAddress = value;
        
        // Link the proof with the on-chain proof id
        const proof = await Proof.findOneAndUpdate(
          { submitterAddress, txHash: { $exists: true } },
          { txHash: String(onChainProofId) },
          { new: true }
        );
        if (proof) {
          console.log(`Linked proof ${proof._id} with on-chain ID ${onChainProofId}`);
        }
      } else if (eventType === "proof_approved") {
        const onChainProofId = topics[1];
        const voterAddress = value;
        
        // Log vote
        const proof = await Proof.findOne({ txHash: String(onChainProofId) });
        if (proof) {
          await Vote.findOneAndUpdate(
            { proofId: proof._id, voterAddress },
            { decision: "approve" },
            { upsert: true }
          );
          console.log(`Approved proof ${onChainProofId} by voter ${voterAddress}`);
        }
      } else if (eventType === "proof_rejected") {
        const onChainProofId = topics[1];
        const voterAddress = value;
        
        // Log vote
        const proof = await Proof.findOne({ txHash: String(onChainProofId) });
        if (proof) {
          await Vote.findOneAndUpdate(
            { proofId: proof._id, voterAddress },
            { decision: "reject" },
            { upsert: true }
          );
          console.log(`Rejected proof ${onChainProofId} by voter ${voterAddress}`);
        }
      } else if (eventType === "challenge_completed") {
        const onChainChallengeId = topics[1];
        const challenge = await Challenge.findOneAndUpdate(
          { contractId: String(onChainChallengeId) },
          { status: "completed" },
          { new: true }
        );
        if (challenge) {
          console.log(`Completed challenge ${challenge._id} on-chain`);
        }
      } else if (eventType === "challenge_failed") {
        const onChainChallengeId = topics[1];
        const challenge = await Challenge.findOneAndUpdate(
          { contractId: String(onChainChallengeId) },
          { status: "failed" },
          { new: true }
        );
        if (challenge) {
          console.log(`Failed challenge ${challenge._id} on-chain`);
        }
      }

      // Save cursor to prevent duplicate processing
      cursor = event.id;
      await SystemState.updateOne(
        { key: "last_processed_event_cursor" },
        { value: cursor },
        { upsert: true }
      );
    } catch (eventErr) {
      console.error("Failed to process event:", event.id, eventErr);
    }
  }
}
