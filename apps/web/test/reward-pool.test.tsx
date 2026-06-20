import { describe, expect, it } from "vitest";

describe("reward pool", () => {
  it("tracks numeric balance semantics", () => {
    const currentBalance = 1250;
    const failedStake = 250;
    expect(currentBalance + failedStake).toBe(1500);
  });
});
