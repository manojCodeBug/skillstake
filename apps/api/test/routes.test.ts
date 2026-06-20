import "./setup";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("api routes", () => {
  it("boots the app factory", () => {
    const app = createApp();
    expect(app).toBeTruthy();
  });
});
