import type { OnboardingItem } from "./types";

// Onboarding checklists per service, from the Leadhaus OS build spec section 5.
type Item = Pick<OnboardingItem, "kind" | "label" | "detail">;

const common: Item[] = [
  { kind: "info", label: "Business and growth brief", detail: "Your goals, offers, customers and what success looks like" },
  { kind: "info", label: "Kickoff call availability", detail: "Two or three times that suit you this week" },
  { kind: "asset", label: "Logo and brand guidelines", detail: "SVG or PNG logo and any brand PDF" },
];

const ads: Item[] = [
  { kind: "info", label: "Unit economics", detail: "Average order or contract value, margin and target cost per lead" },
  { kind: "access", label: "Meta Business Manager", detail: "Partner access for Leadhaus Studios" },
  { kind: "access", label: "Ad account", detail: "Admin access on your ad account" },
  { kind: "access", label: "Facebook Page and Instagram", detail: "Advertiser access" },
  { kind: "access", label: "Pixel and Conversions API", detail: "Share the dataset with Leadhaus" },
  { kind: "access", label: "Google Analytics 4", detail: "Editor access" },
  { kind: "access", label: "Google Tag Manager", detail: "Publish access to the website container" },
  { kind: "access", label: "Website CMS", detail: "Editor login for landing page updates" },
  { kind: "asset", label: "Product photos and videos", detail: "JPG, PNG or MP4" },
  { kind: "asset", label: "Testimonials and reviews", detail: "With consent from each customer" },
];

const influencer: Item[] = [
  { kind: "info", label: "Target audience", detail: "Who you want to reach, where they live, what they follow" },
  { kind: "info", label: "Creator criteria", detail: "Niches, follower range and any creators to avoid" },
  { kind: "info", label: "Products for creators", detail: "Which products to send and how many" },
  { kind: "access", label: "Instagram and TikTok", detail: "Access for whitelisting and paid amplification" },
  { kind: "asset", label: "Product photos", detail: "High-resolution product shots" },
  { kind: "asset", label: "Previous creator content", detail: "Any past creator posts you liked" },
];

const creative: Item[] = [
  { kind: "info", label: "Creative brief", detail: "What you need made, where it will run and by when" },
  { kind: "asset", label: "Product photos and videos", detail: "JPG, PNG or MP4" },
  { kind: "asset", label: "Examples you like", detail: "Links or screenshots of ads you admire" },
];

const strategy: Item[] = [
  { kind: "info", label: "Current marketing channels", detail: "What you run today and what it costs" },
  { kind: "access", label: "Google Analytics 4", detail: "Viewer access" },
  { kind: "asset", label: "Previous reports", detail: "Any past marketing or sales reports" },
];

export function onboardingTemplate(service: string): Item[] {
  const extra = service.startsWith("Influencer") ? influencer : service.startsWith("Creative") ? creative : service.startsWith("Strategy") ? strategy : ads;
  return [...common, ...extra];
}
