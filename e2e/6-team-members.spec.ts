import { test, expect } from "@playwright/test";
import { signInAs, signOut, resetDemo } from "./helpers";

test("Dare adds a team member who can then sign in to the workspace", async ({ page }) => {
  await resetDemo(page);
  await signInAs(page, "Dare");
  await page.goto("/admin/team");
  await page.getByText("Add a team member", { exact: true }).click();
  await page.locator("#tm-name").fill("Tunde");
  await page.locator("#tm-email").fill("not-an-email");
  await page.locator("#tm-title").fill("Media Buyer");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.locator("#tm-email:invalid")).toHaveCount(1);
  await page.locator("#tm-email").fill("tunde@leadhausstudios.com");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText("Invitation sent.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tunde" })).toBeVisible();
  await signOut(page);
  await signInAs(page, "Tunde");
  await expect(page).toHaveURL(/\/admin$/);
});
