import { test, expect, type Page } from "@playwright/test";
import { resetDemo, signInAs, openPage } from "./helpers";

// Team controls: every change made in Settings, Manage portal and Inbox
// must show up for the client. Starts and ends from fresh demo data.

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await resetDemo(page);
  await page.close();
});

const manageNorthstar = async (page: Page) => {
  await signInAs(page, "Dare");
  await openPage(page, /^Clients/, "Clients");
  await page.locator("section").filter({ has: page.getByRole("heading", { name: "Northstar Wellness" }) }).getByRole("link", { name: "Manage portal" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Manage Northstar Wellness" })).toBeVisible();
};

test("settings: validation, announcement and bank details reach the client", async ({ page }) => {
  await signInAs(page, "Dare");
  await openPage(page, /^Settings/, "Settings");
  await page.getByLabel("Account number").fill("123");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Nigerian account numbers have 10 digits.")).toBeVisible();
  await page.getByLabel("Bank", { exact: true }).fill("GTBank");
  await page.getByLabel("Account number").fill("0123456789");
  await page.getByLabel("Message").fill("Our office is closed on Friday. Campaigns keep running.");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved. Clients see the change now.")).toBeVisible();

  await signInAs(page, "Ada Nwosu");
  await expect(page.getByRole("note")).toContainText("Our office is closed on Friday");
  await page.goto("/portal/billing/i1");
  await expect(page.getByText("GTBank")).toBeVisible();
  await expect(page.getByText("0123456789")).toBeVisible();
});

test("goals: team updates numbers, client sees them", async ({ page }) => {
  await manageNorthstar(page);
  const goal = page.getByRole("group", { name: "Booked consultations" });
  await goal.getByLabel("Now").fill("72");
  await page.getByRole("button", { name: "Save goals" }).click();
  await expect(page.getByText("Goals saved.")).toBeVisible();
  await signInAs(page, "Ada Nwosu");
  await page.goto("/portal/strategy");
  const card = page.locator("section").filter({ hasText: "Booked consultations" });
  await expect(card.getByText("72", { exact: true })).toBeVisible();
  await expect(card.getByText("On target")).toBeVisible();
});

test("project progress, deliverables and campaign status", async ({ page }) => {
  await manageNorthstar(page);
  const project = page.locator("section").filter({ hasText: "New patient acquisition" }).filter({ has: page.getByRole("button", { name: "Save project" }) });
  // The browser refuses numbers above 100 before anything is sent.
  await project.getByLabel("New progress, 0 to 100").fill("140");
  expect(await project.getByLabel("New progress, 0 to 100").evaluate((e: HTMLInputElement) => e.checkValidity())).toBe(false);
  await project.getByLabel("New progress, 0 to 100").fill("75");
  await project.getByLabel(/October offer landing page/).selectOption("Delivered");
  await project.getByLabel("Add a deliverable (optional)").fill("November creative sprint");
  await project.getByLabel("Due date").fill("2026-11-05");
  await project.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByText("Project saved. The client sees the new progress now.")).toBeVisible();

  const campaign = page.locator("li").filter({ hasText: "October offer launch" });
  await campaign.getByLabel(/Status for/).selectOption("Live");
  await campaign.getByRole("button", { name: "Save" }).click();
  await expect(campaign.getByText("Status updated.")).toBeVisible();

  await signInAs(page, "Ada Nwosu");
  await openPage(page, /^Projects/, "Projects");
  await expect(page.getByRole("progressbar").first()).toHaveAttribute("aria-valuenow", "75");
  await expect(page.getByText("November creative sprint")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "October offer launch" }).getByText("Live")).toBeVisible();
});

test("onboarding: team asks for something and ticks items", async ({ page }) => {
  await manageNorthstar(page);
  await page.locator("summary", { hasText: "Ask the client for something" }).click();
  await page.getByLabel("What you need").fill("TikTok Business Center access");
  await page.getByLabel("Type").selectOption("access");
  await page.getByRole("button", { name: "Add to their list" }).click();
  await expect(page.getByText("Added to their onboarding list and dashboard.")).toBeVisible();
  await page.getByRole("button", { name: "Tick Website CMS" }).click();
  await expect(page.getByRole("button", { name: "Untick Website CMS" })).toBeVisible();

  await signInAs(page, "Ada Nwosu");
  await expect(page.getByText("TikTok Business Center access")).toBeVisible();
  await openPage(page, /^Onboarding/, "Onboarding");
  await expect(page.locator("div.flex.gap-3.p-4").filter({ hasText: "Website CMS" }).getByText(/^Done /)).toBeVisible();
  await expect(page.locator("div.flex.gap-3.p-4").filter({ hasText: "TikTok Business Center access" }).getByRole("button", { name: "I have granted access" })).toBeVisible();
});

test("portal settings: hide a page, change lead, add a note", async ({ page }) => {
  await manageNorthstar(page);
  await page.getByLabel("Account lead").selectOption("Fareedah");
  await page.getByRole("checkbox", { name: "Strategy" }).uncheck();
  await page.getByLabel("Note on their dashboard").fill("Great month so far. Let us catch up on Friday.");
  await page.getByRole("button", { name: "Save portal settings" }).click();
  await expect(page.getByText("Saved. The client sees this now.")).toBeVisible();

  await signInAs(page, "Ada Nwosu");
  await expect(page.getByText("A note from Fareedah")).toBeVisible();
  await expect(page.getByText("Great month so far.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Strategy/ })).toHaveCount(0);
  await page.goto("/portal/strategy");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("chat: client asks, team replies in the inbox", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await openPage(page, /^Messages/, "Messages");
  await page.getByLabel("Message").fill("Can you send the October report as a PDF?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Can you send the October report as a PDF?")).toBeVisible();

  await signInAs(page, "Oma");
  await openPage(page, /^Inbox/, "Inbox");
  await page.getByRole("navigation", { name: "Clients" }).getByRole("link", { name: /Northstar Wellness/ }).click();
  await expect(page.getByText("Can you send the October report as a PDF?")).toBeVisible();
  await expect(page.getByText("Needs reply", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Reply to Northstar Wellness").fill("Yes, it is on your Reports page. Click Print or save as PDF.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Yes, it is on your Reports page.")).toBeVisible();
  await expect(page.getByText("Needs reply", { exact: true })).toHaveCount(0);

  await signInAs(page, "Ada Nwosu");
  await openPage(page, /^Messages/, "Messages");
  await expect(page.getByText("Yes, it is on your Reports page.")).toBeVisible();
});

test("Zainab is untouched by Northstar changes", async ({ page }) => {
  await signInAs(page, "Zainab Bello");
  await expect(page.getByText("Great month so far.")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Strategy/ })).toHaveCount(0); // off by default for Fika
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Billing/ })).toBeVisible();
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await resetDemo(page);
  await page.close();
});
