import { describe, expect, it } from "vitest";
import { truncateAddress, formatAmount } from "../src/lib/utils";

describe("wallet utilities", () => {
  it("truncates a stellar address", () => {
    expect(truncateAddress("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")).toBe("GAAAA...AAAA");
  });

  it("formats xlm amounts", () => {
    expect(formatAmount(1234.5)).toBe("1,234.50");
  });
});
