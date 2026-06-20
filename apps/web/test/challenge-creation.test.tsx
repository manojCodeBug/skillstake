import { describe, expect, it } from "vitest";
import { challengeCreateSchema } from "@skillstake/shared";

describe("challenge creation", () => {
  it("accepts a valid payload", () => {
    const result = challengeCreateSchema.safeParse({
      creatorAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      title: "Build a Project",
      description: "Ship a production-ready project in thirty days.",
      category: "build",
      stakeAmount: 100,
      durationDays: 30,
      verificationThreshold: 3,
    });

    expect(result.success).toBe(true);
  });
});
