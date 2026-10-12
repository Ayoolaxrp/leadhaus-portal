import { test, expect } from "@playwright/test";
import { signInAs, openPage, signOut, resetDemo } from "./helpers";

// Team journey: runs after 1-client.spec.ts (files run in name order), so Ada's
// question, change request and payment notice are waiting for the team.

test.describe.configure({ mode: "serial" });

test("overview shows what needs attention", async ({ page }) => {
  await signInAs(page, "Dare");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1, name: /Dare\./ })).toBeVisible();
  await expect(page.getByText(/Ada Nwosu asked: Can we add a Saturday clinic offer/)).toBeVisible();
  await expect(page.getByText(/asked for changes on Testimonial cut/)).toBeVisible();
  await expect(page.getByText(/says INV-2026-011 is paid/)).toBeVisible();
  await expect(page.getByText(/Approved: October offer static/)).toBeVisible();
  await page.getByText(/says INV-2026-011 is paid/).click();
  await expect(page.getByRole("heading", { level: 1, name: "Finance" })).toBeVisible();
});

test("every team menu item opens", async ({ page }) => {
  await signInAs(page, "Oma");
  for (const [label, heading] of [["Inbox", "Inbox"], ["Settings", "Settings"], ["Leads", "Leads"], ["Clients", "Clients"], ["Delivery", "Delivery"], ["Finance", "Finance"], ["Team", "Team"], ["Overview", /Oma\./]] as const) {
    await openPage(page, new RegExp(`^${label}`), heading);
  }
});

test("leads: search, add, advance, mark lost", async ({ page }) => {
  await signInAs(page, "Dare");
  await openPage(page, /^Leads/, "Leads");
  await page.getByLabel("Search leads").fill("meridian");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("cell", { name: /Meridian Health Group/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Kola Kitchens/ })).toHaveCount(0);
  await page.getByLabel("Search leads").fill("");
  await page.getByRole("button", { name: "Search" }).click();

  await page.locator("summary", { hasText: "Add a lead" }).click();
  await page.getByLabel("Company name").fill("Ikoyi Dental Studio");
  await page.getByLabel("Contact person").fill("Bisi Ogun");
  await page.getByLabel("Deal value in naira").fill("450000");
  await page.getByLabel("How likely to sign").selectOption("HOT");
  await page.getByRole("button", { name: "Save lead" }).click();
  const row = page.getByRole("row").filter({ hasText: "Ikoyi Dental Studio" });
  await expect(row).toBeVisible();
  await expect(row.getByText("New Lead")).toBeVisible();
  await row.getByRole("button", { name: "Advance" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Ikoyi Dental Studio" }).getByText("Contacted")).toBeVisible();
  await page.getByRole("row").filter({ hasText: "Brightpath Schools" }).getByRole("button", { name: "Lost" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Brightpath Schools" }).getByText("Lost")).toBeVisible();
});

test("clients: reply to a question and post an internal note", async ({ page }) => {
  await signInAs(page, "Oma");
  await openPage(page, /^Clients/, "Clients");
  const northstar = page.locator("section").filter({ has: page.getByRole("heading", { name: "Northstar Wellness" }) });
  await expect(northstar.getByText("Needs reply")).toHaveCount(2);
  await expect(northstar.getByText("Margin", { exact: true })).toBeVisible();
  await expect(northstar.getByText(/clinic-photo.jpg/)).toBeVisible();
  await northstar.getByLabel("Post to Northstar Wellness").fill("Yes, we can run a Saturday offer. Draft coming Monday.");
  await northstar.getByRole("button", { name: "Post" }).click();
  await expect(northstar.getByText("Needs reply")).toHaveCount(0);
  await northstar.getByLabel("Post to Northstar Wellness").fill("Internal: check Saturday staffing before promising.");
  await northstar.getByLabel("Internal note only").check();
  await northstar.getByRole("button", { name: "Post" }).click();
  await expect(northstar.getByText("Internal: check Saturday staffing")).toBeVisible();
});

test("delivery: send creative, add and finish tasks, publish report", async ({ page }) => {
  await signInAs(page, "Fareedah");
  await openPage(page, /^Delivery/, "Delivery");
  await page.getByRole("row").filter({ hasText: "Retargeting static" }).getByRole("button", { name: "Send to client" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Retargeting static" }).getByText("Client review")).toBeVisible();

  await page.locator("summary", { hasText: "Add a task" }).click();
  await page.getByLabel("What needs doing").fill("Send Saturday offer draft");
  await page.getByLabel("Due date").fill("2026-10-12");
  await page.getByLabel("Client can see this").check();
  await page.getByRole("button", { name: "Save task" }).click();
  const task = page.getByRole("listitem").filter({ hasText: "Send Saturday offer draft" });
  await expect(task).toBeVisible();

  const internal = page.getByRole("listitem").filter({ hasText: "Chase Tolu on regrade" });
  await internal.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Chase Tolu on regrade" })).toHaveCount(0);

  await page.getByRole("listitem").filter({ hasText: "October performance report" }).getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "October performance report" }).getByText("Published")).toBeVisible();
});

test("finance: confirm payment and create an invoice", async ({ page }) => {
  await signInAs(page, "Dare");
  await openPage(page, /^Finance/, "Finance");
  const inv = page.getByRole("row").filter({ hasText: "INV-2026-011" });
  await expect(inv.getByText("Client says paid")).toBeVisible();
  await inv.getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByRole("row").filter({ hasText: "INV-2026-011" }).getByText("Paid", { exact: true })).toBeVisible();

  await page.locator("summary", { hasText: "Create an invoice" }).click();
  await page.getByLabel("What it is for").fill("November retainer");
  await page.getByLabel("Amount in naira").fill("350000");
  await page.getByLabel("Due date").fill("2026-11-08");
  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(page.getByRole("row").filter({ hasText: "November retainer" })).toBeVisible();
});

test("team page and sign out", async ({ page }) => {
  await signInAs(page, "Dare");
  await openPage(page, /^Team/, "Team");
  await expect(page.getByRole("heading", { name: "Fareedah" })).toBeVisible();
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/admin$/);
  await signOut(page);
});

test("Ada sees the team's changes and nothing internal", async ({ page }) => {
  await signInAs(page, "Ada Nwosu");
  await expect(page.getByText(/Review Retargeting static/)).toBeVisible();
  await expect(page.getByText(/Send Saturday offer draft/)).toHaveCount(0); // agency task, not a client job
  await openPage(page, /^Messages/, "Messages");
  await expect(page.getByText(/Draft coming Monday/)).toBeVisible();
  await expect(page.getByText(/check Saturday staffing/)).toHaveCount(0);
  await openPage(page, /^Reports/, "Reports");
  await expect(page.getByText("October performance report")).toBeVisible();
  await openPage(page, /^Billing/, "Billing");
  await expect(page.getByText(/November retainer/)).toBeVisible();
  await openPage(page, /^Creative approval/, "Creative approval");
  await expect(page.locator("article").filter({ hasText: "Retargeting static" })).toBeVisible();
  await expect(page.getByText(/Check the headline before this goes to Ada/)).toHaveCount(0);
});

test("Zainab only sees Fika Foods", async ({ page }) => {
  await signInAs(page, "Zainab Bello");
  await expect(page.getByText("Fika Foods").first()).toBeVisible();
  for (const path of ["/portal", "/portal/billing", "/portal/documents", "/portal/messages", "/portal/creative"]) {
    await page.goto(path);
    await expect(page.locator("main")).not.toContainText(/Northstar|Ada Nwosu|INV-2026-011/);
  }
});

test("reset demo puts everything back", async ({ page }) => {
  await resetDemo(page);
  await signInAs(page, "Ada Nwosu");
  await expect(page.getByText(/3 jobs waiting for you/)).toBeVisible();
});
