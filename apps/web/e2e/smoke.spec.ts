import { test, expect } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("SkillStake")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Challenge" })).toBeVisible();
});
