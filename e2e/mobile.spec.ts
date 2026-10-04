import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers";

// Phone-sized screen: menu scrolls sideways, pages fit without sideways scrolling.

test("client portal works on a phone", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: /^Billing/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Billing" })).toBeVisible();
  for (const path of ["/portal", "/portal/creative", "/portal/onboarding", "/portal/billing"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(1);
  }
});

test("team workspace works on a phone", async ({ page }) => {
  await signInAs(page, "Oma");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Finance/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Finance" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
