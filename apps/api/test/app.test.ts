import { describe, expect, it } from "vitest";
import { challengeCreateSchema, proofSubmissionSchema, voteSchema } from "@skillstake/shared";

describe("shared schemas", () => {
  it("validates a challenge payload", () => {
    const result = challengeCreateSchema.safeParse({
      creatorAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      title: "30 Days of DSA",
      description: "Complete thirty days of data structures and algorithms practice.",
      category: "learning",
      stakeAmount: 100,
      durationDays: 30,
      verificationThreshold: 3,
    });

    expect(result.success).toBe(true);
  });

  it("validates a proof payload", () => {
    const result = proofSubmissionSchema.safeParse({
      challengeId: "507f1f77bcf86cd799439011",
      submitterAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      title: "Completed course",
      description: "I completed the course with project submission.",
      githubLink: "",
      externalUrl: "",
      textEvidence: "Screenshots and notes are attached.",
    });

    expect(result.success).toBe(true);
  });

  it("validates a vote payload", () => {
    const result = voteSchema.safeParse({
      proofId: "507f1f77bcf86cd799439011",
      voterAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      decision: "approve",
    });

    expect(result.success).toBe(true);
  });
});
