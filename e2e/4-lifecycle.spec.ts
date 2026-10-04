import { test, expect, type Page } from "@playwright/test";
import { resetDemo, signInAs, openPage } from "./helpers";

// A brand-new client from first day to first report. Every team action is
// checked from the client side, so admin pages and client pages stay in step.

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await resetDemo(page);
  await page.close();
});

const manage = async (page: Page, tab: string) => {
  await signInAs(page, "Dare");
  await openPage(page, /^Clients/, "Clients");
  await page.locator("section").filter({ has: page.getByRole("heading", { name: "Lagos Smile Dental" }) }).getByRole("link", { name: "Manage portal" }).click();
  await page.getByRole("navigation", { name: "Client sections" }).getByRole("link", { name: tab }).click();
  await expect(page.getByRole("navigation", { name: "Client sections" }).getByRole("link", { name: tab })).toHaveAttribute("aria-current", "page");
};

test("team adds a client and starts onboarding", async ({ page }) => {
  await signInAs(page, "Dare");
  await openPage(page, /^Clients/, "Clients");
  await page.locator("summary", { hasText: "Add a client" }).click();
  await page.getByRole("button", { name: "Add client" }).click(); // browser blocks empty required fields
  await expect(page.getByRole("heading", { name: "Lagos Smile Dental" })).toHaveCount(0);
  await page.getByLabel("Business name").fill("Lagos Smile Dental");
  await page.getByLabel("Person who signs in").fill("Chioma Eze");
  await page.getByLabel("Their email").fill("chioma@lagossmile.ng");
  await page.getByLabel("Service").selectOption("Ads Management");
  await page.getByLabel("Account lead").selectOption("Oma");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText("Client added. They can now sign in to their portal.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lagos Smile Dental" })).toBeVisible();

  await page.getByLabel("Their email").fill("chioma@lagossmile.ng");
  await page.getByLabel("Business name").fill("Another Name");
  await page.getByLabel("Person who signs in").fill("Someone");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText("That email already has portal access.")).toBeVisible();
});

test("new client sees onboarding everywhere", async ({ page }) => {
  await signInAs(page, "Chioma Eze");
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
  await expect(page.getByText("Complete your onboarding checklist")).toBeVisible();
  await page.getByRole("link", { name: "Open onboarding" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Onboarding" })).toBeVisible();
  await expect(page.getByText("Meta Business Manager")).toBeVisible();
  await expect(page.getByText("Unit economics")).toBeVisible();
  await expect(page.getByRole("list", { name: /Onboarding stage: Gathering details/ }).first()).toBeVisible();
  await openPage(page, /^Messages/, "Messages");
  await expect(page.getByText(/Your onboarding has started/)).toBeVisible();
  await expect(page.getByText(/Oma is your account lead/)).toBeVisible();
  for (const path of ["/portal", "/portal/billing", "/portal/messages"]) {
    await page.goto(path);
    await expect(page.locator("main")).not.toContainText(/Northstar|Fika|Ada Nwosu/);
  }
});

test("reminder and stages move the client along", async ({ page }) => {
  await manage(page, "Onboarding");
  await expect(page.getByRole("button", { name: "Start onboarding" })).toHaveCount(0);
  await page.getByRole("button", { name: /Send a reminder/ }).click();
  await expect(page.getByText("Reminder sent to Chioma.")).toBeVisible();
  await page.getByRole("button", { name: "Add the Ads Management checklist" }).click();
  await expect(page.getByText("Every item from the checklist is already on their list.")).toBeVisible();
  await page.getByLabel("Move to stage").selectOption("Complete");
  await page.getByRole("button", { name: "Save stage" }).click();
  await expect(page.getByText("Stage saved. The client sees it now.")).toBeVisible();

  await signInAs(page, "Chioma Eze");
  await expect(page.getByRole("heading", { name: "Getting started" })).toHaveCount(0);
  await expect(page.getByText("Complete your onboarding checklist")).toHaveCount(0);
  await openPage(page, /^Messages/, "Messages");
  await expect(page.getByText(/A friendly reminder: we still need/)).toBeVisible();
  await expect(page.getByText(/Onboarding is complete/)).toBeVisible();
});

test("projects and campaigns", async ({ page }) => {
  await manage(page, "Projects");
  await page.getByLabel("Project name").fill("Smile makeover launch");
  await page.getByLabel("End date").first().fill("2026-12-20");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByText("Project added. It is on their Projects page now.")).toBeVisible();
  await page.locator("summary", { hasText: "Add a campaign" }).click();
  await page.getByLabel("Campaign name").fill("Invisalign leads");
  await page.getByLabel("Start date").fill("2026-10-10");
  await page.locator("#cp-end").fill("2026-12-31");
  await page.getByRole("button", { name: "Add campaign" }).click();
  await expect(page.getByText("Campaign added.")).toBeVisible();

  await signInAs(page, "Chioma Eze");
  await openPage(page, /^Projects/, "Projects");
  await expect(page.getByRole("heading", { name: "Smile makeover launch" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Invisalign leads" }).getByText("Planning")).toBeVisible();
});

test("creatives: add, client asks for changes, team uploads a new version", async ({ page }) => {
  await manage(page, "Creatives");
  await page.locator("summary", { hasText: "Add a creative" }).click();
  await page.getByLabel("Name").fill("Smile makeover static");
  await page.getByRole("button", { name: "Add creative" }).click();
  await expect(page.getByText("Creative added.")).toBeVisible();

  await signInAs(page, "Chioma Eze");
  await expect(page.getByText("Review Smile makeover static")).toBeVisible();
  await openPage(page, /^Creative approval/, "Creative approval");
  const card = page.locator("article").filter({ hasText: "Smile makeover static" });
  await card.getByLabel(/Note for the team/).fill("Please use a brighter photo.");
  await card.getByRole("button", { name: "Request changes" }).click();
  await expect(page.locator("article").filter({ hasText: "Smile makeover static" }).getByText("Revision requested", { exact: true })).toBeVisible();

  await manage(page, "Creatives");
  const admin = page.locator("section").filter({ hasText: "Smile makeover static" });
  await expect(admin.getByText("Please use a brighter photo.")).toBeVisible();
  await admin.getByLabel("Comment on Smile makeover static").fill("On it, new version today.");
  await admin.getByRole("button", { name: "Post" }).click();
  await expect(admin.getByText("On it, new version today.")).toBeVisible();
  await admin.getByRole("button", { name: "Upload new version" }).click();
  await expect(admin.getByText("version 2")).toBeVisible();

  await signInAs(page, "Chioma Eze");
  await openPage(page, /^Creative approval/, "Creative approval");
  const again = page.locator("article").filter({ hasText: "Smile makeover static" });
  await expect(again.getByRole("button", { name: "V2" })).toBeVisible();
  await expect(again.getByText("On it, new version today.")).toBeVisible();
  await again.getByRole("button", { name: "Approve" }).click();
  await expect(page.locator("article").filter({ hasText: "Smile makeover static" }).getByText(/Approved by Chioma Eze/)).toBeVisible();
});

test("weekly numbers and a published report reach the client", async ({ page }) => {
  await manage(page, "Reports and numbers");
  await page.getByLabel("Week starting").fill("2026-09-28");
  await page.getByLabel("Ad spend in naira").fill("120000");
  await page.getByLabel("Leads", { exact: true }).fill("37");
  await page.getByLabel("Revenue in naira").fill("640000");
  await page.getByRole("button", { name: "Save numbers" }).click();
  await expect(page.getByText("Numbers saved. Their dashboard is updated.")).toBeVisible();
  await page.getByLabel("Title").fill("First week report");
  await page.getByLabel("From").fill("2026-09-28");
  await page.getByLabel("To", { exact: true }).fill("2026-10-04");
  await page.getByLabel("Summary").fill("A strong first week with 37 leads.");
  await page.getByLabel("Highlights (one per line)").fill("37 leads\nCost per lead under 3,300 naira");
  await page.getByLabel("Publish to the client now").check();
  await page.getByRole("button", { name: "Save report" }).click();
  await expect(page.getByText("Report saved.")).toBeVisible();

  await signInAs(page, "Chioma Eze");
  await expect(page.getByText("Leads, last 4 weeks").locator("..")).toContainText("37");
  await openPage(page, /^Reports/, "Reports");
  await expect(page.getByRole("heading", { name: "First week report" })).toBeVisible();
  await expect(page.getByText("Cost per lead under 3,300 naira")).toBeVisible();
});

test("strategy and documents", async ({ page }) => {
  await manage(page, "Strategy");
  await page.getByLabel("Summary").fill("Win more Invisalign patients across Lekki and Ikoyi.");
  await page.getByLabel(/Recommendations/).fill("Lead with before and after: Real patient results convert best.");
  await page.getByLabel("Add a goal (optional)").fill("Invisalign consultations");
  await page.getByLabel("Target", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Save strategy" }).click();
  await expect(page.getByText("Strategy saved.")).toBeVisible();

  await page.getByRole("navigation", { name: "Client sections" }).getByRole("link", { name: "Documents" }).click();
  await expect(page.getByRole("heading", { name: "Share a document" })).toBeVisible();
  await page.getByLabel("Title").fill("Ads Management agreement");
  await page.getByLabel("Type").selectOption("Contract");
  await page.getByLabel(/Text/).fill("This agreement starts on 1 October 2026.\nFee is payable monthly.");
  await page.getByRole("button", { name: "Share document" }).click();
  await expect(page.getByText("Document shared. It is on their Documents page now.")).toBeVisible();

  await signInAs(page, "Chioma Eze");
  await openPage(page, /^Strategy/, /Growth strategy/);
  await expect(page.getByText("Win more Invisalign patients")).toBeVisible();
  await expect(page.getByText("Lead with before and after")).toBeVisible();
  await expect(page.getByText("Invisalign consultations")).toBeVisible();
  await openPage(page, /^Documents/, "Documents");
  await page.getByRole("link", { name: /Ads Management agreement/ }).click();
  await expect(page.getByText("This agreement starts on 1 October 2026.")).toBeVisible();

  await manage(page, "Documents");
  await page.locator("div").filter({ hasText: /^Ads Management agreement/ }).getByRole("button", { name: "Hide" }).first().click();
  await signInAs(page, "Chioma Eze");
  await openPage(page, /^Documents/, "Documents");
  await expect(page.getByText("Ads Management agreement")).toHaveCount(0);
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await resetDemo(page);
  await page.close();
});
