import { test, expect } from "@playwright/test";
import { resetDemo, signInAs, signOut, openPage } from "./helpers";

// Client journey: Ada Nwosu at Northstar Wellness clicks every feature.

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await resetDemo(page);
  await page.close();
});

test("sign in page lists accounts and signs Ada in", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ada Nwosu/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Dare/ })).toBeVisible();
  await signInAs(page, "Ada Nwosu");
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole("heading", { level: 1, name: /Ada\./ })).toBeVisible();
});

test("dashboard: help, numbers, jobs and links", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await page.getByText("How does this page work?").click();
  await expect(page.getByText("This is your home page.")).toBeVisible();
  await page.getByText("Hide help").click();
  await expect(page.getByText("Leads, last 4 weeks")).toBeVisible();
  await expect(page.getByText("Return on ad spend")).toBeVisible();
  await expect(page.getByText(/3 jobs waiting for you/)).toBeVisible();
  await page.getByRole("link", { name: "Do this now" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Creative approval" })).toBeVisible();
  await page.goBack();
  await page.getByRole("link", { name: "All reports" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
});

test("every menu item opens its page", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  const pages: [RegExp, RegExp][] = [
    [/^Projects/, /Projects/], [/^Creative approval/, /Creative approval/], [/^Strategy/, /growth strategy/i],
    [/^Reports/, /Reports/], [/^Onboarding/, /Onboarding/], [/^Documents/, /Documents/],
    [/^Messages/, /Messages/], [/^Billing/, /Billing/], [/^Dashboard/, /Ada\./],
  ];
  for (const [label, heading] of pages) await openPage(page, label, heading);
});

test("creative approval: versions, comments, approve and request changes", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await openPage(page, /^Creative approval/, "Creative approval");
  const card = page.locator("article").filter({ hasText: "Testimonial cut" });
  await expect(card.getByRole("img", { name: /version 2/ })).toBeVisible();
  await card.getByRole("button", { name: "V1" }).click();
  await expect(card.getByRole("img", { name: /version 1/ })).toBeVisible();

  await card.getByRole("button", { name: "Post" }).click();
  await expect(card.getByText("Type your comment in the box first.")).toBeVisible();
  await card.getByLabel("Add a comment").fill("Love the opening. Can the price be bigger?");
  await card.getByRole("button", { name: "Post" }).click();
  await expect(card.getByText("Love the opening. Can the price be bigger?")).toBeVisible();

  await card.getByRole("button", { name: "Request changes" }).click();
  await expect(card.getByText(/Please write what you would like changed/)).toBeVisible();
  await card.getByLabel(/Note for the team/).fill("Use the October price on the end card.");
  await card.getByRole("button", { name: "Request changes" }).click();
  await expect(page.locator("article").filter({ hasText: "Testimonial cut" }).getByText("Revision requested", { exact: true })).toBeVisible();

  const offer = page.locator("article").filter({ hasText: "October offer static" });
  await offer.getByRole("button", { name: "Approve" }).click();
  await expect(page.locator("article").filter({ hasText: "October offer static" }).getByText(/Approved by Ada Nwosu/)).toBeVisible();
  await expect(page.getByText("You are all caught up")).toBeVisible();
});

test("onboarding: answer, confirm access, upload files", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await openPage(page, /^Onboarding/, "Onboarding");
  const offer = page.locator("div.flex.gap-3.p-4").filter({ hasText: "October offer details" });
  await offer.getByRole("button", { name: "Send" }).click();
  await expect(offer.getByText("Type your answer in the box first.")).toBeVisible();
  await offer.getByLabel("Your answer").fill("20% off first consultation, ends 31 October.");
  await offer.getByRole("button", { name: "Send" }).click();
  await expect(page.locator("div.flex.gap-3.p-4").filter({ hasText: "October offer details" }).getByText(/^Done /)).toBeVisible();

  const gtm = page.locator("div.flex.gap-3.p-4").filter({ hasText: "Google Tag Manager" });
  await gtm.getByRole("button", { name: "I have granted access" }).click();
  await expect(page.locator("div.flex.gap-3.p-4").filter({ hasText: "Google Tag Manager" }).getByText(/^Done /)).toBeVisible();

  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText(/Click Choose files and pick at least one file first/)).toBeVisible();
  await page.locator("#files").setInputFiles({ name: "notes.exe", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText(/notes.exe cannot be uploaded/)).toBeVisible();
  await page.locator("#files").setInputFiles({ name: "clinic-photo.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(2048, 1) });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("clinic-photo.jpg")).toBeVisible();
});

test("dashboard jobs disappear once done", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await expect(page.getByRole("heading", { name: /\d+ jobs? waiting for you/ })).toHaveCount(0);
});

test("documents open and can be printed", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await openPage(page, /^Documents/, "Documents");
  await expect(page.getByText("Pricing and margin workings")).toHaveCount(0);
  await page.getByRole("link", { name: /Service agreement/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Service agreement" })).toBeVisible();
  await expect(page.getByText(/30 days written notice/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
  await page.getByRole("link", { name: "Back to documents" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible();
});

test("messages: ask a question", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await openPage(page, /^Messages/, "Messages");
  await expect(page.getByText(/client portal is live/)).toBeVisible();
  await expect(page.getByText(/hold reply/)).toHaveCount(0);
  await page.getByLabel("Message").fill("Can we add a Saturday clinic offer?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Can we add a Saturday clinic offer?")).toBeVisible();
});

test("billing: view invoice and tell the team it is paid", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await openPage(page, /^Billing/, "Billing");
  await expect(page.getByRole("heading", { name: "Payment history" })).toBeVisible();
  await page.getByRole("link", { name: "View invoice" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /INV-2026-011/ })).toBeVisible();
  await expect(page.getByText("Payment reference")).toBeVisible();
  await page.getByRole("button", { name: "I have paid" }).click();
  await expect(page.getByText(/You told us you paid on/)).toBeVisible();
  await page.getByRole("link", { name: "Back to billing" }).click();
  await expect(page.getByText("Payment sent, awaiting confirmation")).toBeVisible();
});

test("reports and strategy", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await openPage(page, /^Reports/, "Reports");
  await expect(page.getByText("October performance report")).toHaveCount(0);
  await page.locator("details").filter({ hasText: "August performance report" }).locator("summary").click();
  await expect(page.getByText("First full month after the account restructure.")).toBeVisible();
  await openPage(page, /^Strategy/, /growth strategy/i);
  await expect(page.getByRole("heading", { name: "Goals and KPIs" })).toBeVisible();
  await expect(page.getByText(/Debated raising fee/)).toHaveCount(0);
});

test("client cannot open team pages and can sign out", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await page.goto("/admin/finance");
  await expect(page).toHaveURL(/\/portal$/);
  await page.goto("/portal/billing/i4"); // Fika's invoice
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.goto("/portal");
  await signOut(page);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/login/);
});
