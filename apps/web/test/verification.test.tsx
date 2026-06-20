import { describe, expect, it } from "vitest";
import { proofSubmissionSchema, voteSchema } from "@skillstake/shared";

describe("verification flow", () => {
  it("accepts proof submissions", () => {
    const result = proofSubmissionSchema.safeParse({
      challengeId: "507f1f77bcf86cd799439011",
      submitterAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      title: "Proof title",
      description: "Substantial evidence of completion.",
      githubLink: "",
      externalUrl: "",
      textEvidence: "Detailed evidence and screenshots.",
    });

    expect(result.success).toBe(true);
  });

  it("accepts votes", () => {
    const result = voteSchema.safeParse({
      proofId: "507f1f77bcf86cd799439011",
      voterAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      decision: "approve",
    });

    expect(result.success).toBe(true);
  });
});
