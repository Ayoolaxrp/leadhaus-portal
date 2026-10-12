import type { Lead } from "./data/types";
import { isEmail } from "./email";

// Turns a leadhausstudios.com form submission into a Leads row. The website
// keeps sending to Formspree and the Google Sheet; this is an extra copy so the
// team can work the lead in the portal. Pure so it can be unit tested.

const FORMS: Record<string, string> = {
  ads: "Website: Ads funnel",
  creator: "Website: Creator funnel",
  contact: "Website: Contact form",
};

// Website field name -> label shown under "Answers" on the Leads page.
const ANSWER_LABELS: [string, string][] = [
  ["business_type", "Business type"],
  ["industry", "Industry"],
  ["website_social", "Website or social"],
  ["revenue", "Monthly revenue"],
  ["ad_spend", "Ad spend"],
  ["goal", "Goal"],
  ["timeline", "Timeline"],
  ["challenge", "Challenge"],
  ["lead_score", "Quiz score"],
  ["utm_source", "UTM source"],
  ["utm_medium", "UTM medium"],
  ["utm_campaign", "UTM campaign"],
  ["utm_content", "UTM content"],
  ["landing_page", "Landing page"],
];

const field = (data: FormData, key: string, max = 300) => String(data.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export type IntakeResult = { lead: Lead } | { error: string; spam?: boolean };

export function leadFromWebsite(data: FormData, owner: string, now = new Date()): IntakeResult {
  // Bots fill every input, people never see this one.
  if (field(data, "_gotcha") || field(data, "company_website_confirm")) return { error: "spam", spam: true };
  const form = field(data, "form", 20);
  const contact = field(data, "full_name", 120);
  const email = field(data, "email", 160).toLowerCase();
  const phone = field(data, "whatsapp", 40);
  if (!contact) return { error: "Missing name." };
  if (!email && !phone) return { error: "Missing email or WhatsApp." };
  if (email && !isEmail(email)) return { error: "Invalid email." };

  const category = field(data, "lead_category", 10).toUpperCase();
  const score: Lead["score"] = category === "HOT" ? "HOT" : category === "LOW-FIT" ? "LOW" : "WARM";
  const answers = ANSWER_LABELS.map(([key, label]) => ({ label, value: field(data, key, key === "challenge" ? 1000 : 300) })).filter((a) => a.value);

  return {
    lead: {
      id: crypto.randomUUID(),
      company: field(data, "brand_name", 120) || contact,
      contact,
      source: FORMS[form] ?? "Website",
      stage: "New Lead",
      value: 0,
      score,
      owner,
      nextAction: score === "HOT" ? "Call today" : "First contact",
      email: email || undefined,
      phone: phone || undefined,
      receivedAt: now.toISOString(),
      answers,
    },
  };
}

const DEFAULT_ORIGINS = ["https://leadhausstudios.com", "https://www.leadhausstudios.com", "https://leadhaus-updated-site.vercel.app"];

export function allowedOrigin(origin: string | null, configured = process.env.LEAD_FORM_ORIGINS): boolean {
  if (!origin) return false;
  const list = configured ? configured.split(",").map((o) => o.trim()).filter(Boolean) : DEFAULT_ORIGINS;
  return list.includes(origin);
}
