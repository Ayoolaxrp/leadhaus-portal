import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers";

const site = { origin: "https://leadhausstudios.com" };

test("a website application lands in Leads with its answers", async ({ page, request }) => {
  const res = await request.post("/api/leads", {
    headers: site,
    multipart: { form: "ads", full_name: "Kemi Website", brand_name: "Kemi Skincare", email: "kemi@example.com", whatsapp: "+2348010000000", lead_category: "HOT", revenue: "N5m to N10m", goal: "Scale ads" },
  });
  expect(res.status()).toBe(201);

  await signInAs(page, "Dare");
  await page.goto("/admin/leads");
  const row = page.getByRole("row").filter({ hasText: "Kemi Skincare" });
  await expect(row).toContainText("Website: Ads funnel");
  await expect(row).toContainText("HOT");
  await expect(row.getByRole("link", { name: "kemi@example.com" })).toHaveAttribute("href", "mailto:kemi@example.com");
  await row.getByText(/^Answers/).click();
  await expect(row).toContainText("Scale ads");
});

test("other websites cannot post leads", async ({ request }) => {
  const res = await request.post("/api/leads", { headers: { origin: "https://evil.example" }, multipart: { full_name: "X", email: "x@example.com" } });
  expect(res.status()).toBe(403);
});
