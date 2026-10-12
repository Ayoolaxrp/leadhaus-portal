import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedOrigin, leadFromWebsite } from "../src/lib/lead-intake";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

test("ads funnel application becomes a scored lead with answers", () => {
  const result = leadFromWebsite(form({ form: "ads", full_name: "Tolu A", brand_name: "Glow Co", email: "Tolu@Glow.co", whatsapp: "+234 801 000 0000", lead_category: "HOT", lead_score: "9", revenue: "N10m+", goal: "More sales", utm_source: "meta" }), "Dare");
  assert.ok("lead" in result);
  const { lead } = result;
  assert.equal(lead.company, "Glow Co");
  assert.equal(lead.contact, "Tolu A");
  assert.equal(lead.email, "tolu@glow.co");
  assert.equal(lead.source, "Website: Ads funnel");
  assert.equal(lead.score, "HOT");
  assert.equal(lead.stage, "New Lead");
  assert.equal(lead.owner, "Dare");
  assert.deepEqual(lead.answers?.find((a) => a.label === "UTM source"), { label: "UTM source", value: "meta" });
});

test("contact form without a brand uses the person's name and WARM", () => {
  const result = leadFromWebsite(form({ form: "contact", full_name: "Ife", whatsapp: "0803" }), "Dare");
  assert.ok("lead" in result);
  assert.equal(result.lead.company, "Ife");
  assert.equal(result.lead.score, "WARM");
  assert.equal(result.lead.source, "Website: Contact form");
});

test("LOW-FIT quiz result maps to LOW", () => {
  const result = leadFromWebsite(form({ form: "ads", full_name: "A", email: "a@b.co", lead_category: "LOW-FIT" }), "Dare");
  assert.ok("lead" in result && result.lead.score === "LOW");
});

test("bot trap and missing contact details are rejected", () => {
  assert.deepEqual(leadFromWebsite(form({ full_name: "Bot", email: "b@b.co", _gotcha: "x" }), "Dare"), { error: "spam", spam: true });
  assert.ok("error" in leadFromWebsite(form({ full_name: "No contact" }), "Dare"));
  assert.ok("error" in leadFromWebsite(form({ email: "a@b.co" }), "Dare"));
  assert.ok("error" in leadFromWebsite(form({ full_name: "A", email: "not-an-email" }), "Dare"));
});

test("only the Leadhaus site origins may post leads", () => {
  assert.equal(allowedOrigin("https://leadhausstudios.com", undefined), true);
  assert.equal(allowedOrigin("https://www.leadhausstudios.com", undefined), true);
  assert.equal(allowedOrigin("https://evil.example", undefined), false);
  assert.equal(allowedOrigin(null, undefined), false);
  assert.equal(allowedOrigin("https://preview.example", "https://preview.example"), true);
});
