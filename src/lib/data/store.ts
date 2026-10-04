import "server-only";
import * as T from "./types";

// Demo store. In production this is Supabase (see supabase/migrations).
// Kept on globalThis so dev hot reloads don't reset in-flight demo state.
// Figures are sample data, not real client results.

const img = (seed: string) => `https://picsum.photos/seed/${seed}/960/1200`;

function weeks(clientId: string, rows: [number, number, number][]): T.WeeklyMetric[] {
  const start = new Date("2026-08-10");
  return rows.map(([spend, leads, revenue], i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    return { clientId, weekStart: d.toISOString().slice(0, 10), spend, leads, revenue };
  });
}

function seed() {
  const users: T.User[] = [
    { id: "u_ada", name: "Ada Nwosu", email: "ada@northstarwellness.ng", role: "client", clientId: "c_northstar", title: "Marketing Director" },
    { id: "u_zainab", name: "Zainab Bello", email: "zainab@fikafoods.ng", role: "client", clientId: "c_fika", title: "Founder" },
    { id: "u_dare", name: "Dare", email: "dare@leadhaus.studio", role: "admin", title: "Founder" },
    { id: "u_oma", name: "Oma", email: "oma@leadhaus.studio", role: "admin", title: "Account and Project Manager" },
    { id: "u_fareedah", name: "Fareedah", email: "fareedah@leadhaus.studio", role: "admin", title: "Creative and Influencer Manager" },
  ];

  const allOn = Object.fromEntries(T.PORTAL_SECTIONS.map((s) => [s, true])) as T.Client["sections"];
  const settings: T.AgencySettings = {
    agencyName: "Leadhaus Studios",
    supportEmail: "hello@leadhaus.studio",
    supportWhatsApp: "+234 801 234 5678",
    replyPromise: "within one working day",
    bank: { bank: "Example Bank", accountName: "Leadhaus Studios Ltd", accountNumber: "0000000000" },
    announcement: "",
  };

  const clients: T.Client[] = [
    { id: "c_northstar", name: "Northstar Wellness", service: "Ads Management", status: "Active", accountLead: "Oma", contactName: "Ada Nwosu", currency: "NGN", monthlyFee: 350000, renewalDate: "2026-11-30", sections: { ...allOn }, welcomeNote: "", onboardingStage: "Ready for Launch", health: "Healthy", marginPct: 41, internalNotes: "Upsell creative retainer at Q4 review. Ada is price sensitive." },
    { id: "c_fika", name: "Fika Foods", service: "Influencer Campaign", status: "Active", accountLead: "Fareedah", contactName: "Zainab Bello", currency: "NGN", monthlyFee: 280000, renewalDate: "2026-12-15", sections: { ...allOn, strategy: false }, welcomeNote: "", onboardingStage: "Complete", health: "Attention", marginPct: 23, internalNotes: "Creator fees eating margin. Renegotiate scope before renewal." },
  ];

  const campaigns: T.Campaign[] = [
    { id: "cp1", clientId: "c_northstar", name: "New patient acquisition", platform: "Meta", objective: "Leads", status: "Optimising", start: "2026-09-01", end: "2026-11-30", monthlyBudget: 980000, internalNotes: "Pixel dropped events 14 Sep, fixed. Do not mention unless asked." },
    { id: "cp2", clientId: "c_northstar", name: "Brand search", platform: "Google Search", objective: "Conversions", status: "Live", start: "2026-09-15", end: "2026-12-31", monthlyBudget: 220000, internalNotes: "" },
    { id: "cp3", clientId: "c_northstar", name: "October offer launch", platform: "Meta", objective: "Leads", status: "Awaiting Approval", start: "2026-10-10", end: "2026-10-31", monthlyBudget: 300000, internalNotes: "" },
    { id: "cp4", clientId: "c_fika", name: "Creator launch sprint", platform: "Instagram + TikTok", objective: "Sales", status: "Live", start: "2026-09-08", end: "2026-10-30", monthlyBudget: 640000, internalNotes: "Two creators late on drafts." },
  ];

  const metrics: T.WeeklyMetric[] = [
    ...weeks("c_northstar", [[188000, 38, 1140000], [205000, 44, 1290000], [196000, 41, 1210000], [231000, 52, 1630000], [244000, 57, 1810000], [238000, 61, 1920000], [252000, 66, 2140000], [249000, 63, 2050000]]),
    ...weeks("c_fika", [[120000, 12, 610000], [138000, 15, 720000], [151000, 14, 690000], [162000, 19, 940000], [158000, 21, 1080000], [171000, 24, 1210000], [166000, 22, 1150000], [174000, 26, 1330000]]),
  ];

  const projects: T.Project[] = [
    { id: "p1", clientId: "c_northstar", name: "New patient acquisition", type: "Ads Management", start: "2026-09-01", end: "2026-11-30", progress: 46, owner: "Oma", capacityNote: "Oma at capacity, Fareedah covering creative.", deliverables: [
      { id: "d1", title: "Campaign launch and tracking setup", due: "2026-09-04", status: "Delivered" },
      { id: "d2", title: "Creative iteration 02 (4 statics, 1 video)", due: "2026-10-08", status: "Client review" },
      { id: "d3", title: "October offer landing page", due: "2026-10-09", status: "In progress" },
      { id: "d4", title: "Monthly strategy review", due: "2026-10-28", status: "Planned" },
    ] },
    { id: "p2", clientId: "c_northstar", name: "Brand search build", type: "Ads Management", start: "2026-09-15", end: "2026-10-15", progress: 80, owner: "Dare", capacityNote: "", deliverables: [
      { id: "d5", title: "Keyword and negative list", due: "2026-09-18", status: "Delivered" },
      { id: "d6", title: "Conversion import from CRM", due: "2026-10-12", status: "In progress" },
    ] },
    { id: "p3", clientId: "c_fika", name: "Creator launch sprint", type: "Influencer Campaign", start: "2026-09-08", end: "2026-10-30", progress: 58, owner: "Fareedah", capacityNote: "", deliverables: [
      { id: "d7", title: "Creator shortlist (12)", due: "2026-09-15", status: "Delivered" },
      { id: "d8", title: "Creator drafts round 1", due: "2026-10-06", status: "Client review" },
    ] },
  ];

  const creatives: T.Creative[] = [
    { id: "cr1", clientId: "c_northstar", title: "Testimonial cut, Dr. Okafor", format: "Video 9:16", platform: "Instagram Reels + Meta", status: "Client review", designer: "Tolu (freelance)", productionCost: 85000,
      versions: [{ version: 1, image: img("northstar-clinic-testimonial-v1"), createdAt: "2026-09-26" }, { version: 2, image: img("northstar-clinic-testimonial-v2"), createdAt: "2026-10-02" }],
      comments: [
        { id: "cm1", author: "Fareedah", authorRole: "admin", body: "V2 tightens the first three seconds and adds the consultation price on screen.", at: "2026-10-02T10:14:00Z", internal: false },
        { id: "cm2", author: "Dare", authorRole: "admin", body: "Tolu's grade is weak, we should not pay the full rate for this one.", at: "2026-10-02T10:40:00Z", internal: true },
      ] },
    { id: "cr2", clientId: "c_northstar", title: "October offer static", format: "Static 4:5", platform: "Meta feed", status: "Client review", designer: "Fareedah", productionCost: 0,
      versions: [{ version: 1, image: img("northstar-october-offer"), createdAt: "2026-10-03" }],
      comments: [{ id: "cm3", author: "Oma", authorRole: "admin", body: "Please confirm the offer price and expiry date before we schedule.", at: "2026-10-03T08:05:00Z", internal: false }] },
    { id: "cr3", clientId: "c_northstar", title: "Before and after carousel", format: "Carousel 1:1", platform: "Meta feed", status: "Approved", designer: "Fareedah", productionCost: 0, decidedBy: "Ada Nwosu", decidedAt: "2026-09-18",
      versions: [{ version: 1, image: img("northstar-carousel"), createdAt: "2026-09-16" }], comments: [] },
    { id: "cr5", clientId: "c_northstar", title: "Retargeting static", format: "Static 1:1", platform: "Meta feed", status: "Internal review", designer: "Fareedah", productionCost: 0,
      versions: [{ version: 1, image: img("northstar-retargeting"), createdAt: "2026-10-04" }], comments: [{ id: "cm5", author: "Dare", authorRole: "admin", body: "Check the headline before this goes to Ada.", at: "2026-10-04T07:30:00Z", internal: true }] },
    { id: "cr4", clientId: "c_fika", title: "Creator draft, @ChefTemi", format: "Video 9:16", platform: "TikTok", status: "Client review", designer: "Creator", productionCost: 150000,
      versions: [{ version: 1, image: img("fika-creator-draft"), createdAt: "2026-10-01" }], comments: [] },
  ];

  const strategies: T.Strategy[] = [
    { clientId: "c_northstar", title: "Q4 growth strategy", updated: "2026-10-01",
      summary: "Grow booked consultations while holding cost per lead under ₦4,000. Testimonials are the strongest angle, so we scale them and fix the slow follow-up that loses warm leads.",
      recommendations: [
        { title: "Scale the testimonial angle", detail: "Testimonial ads convert at a lower cost per lead than the account average. Shift 30% more budget to them." },
        { title: "Make the lead form more specific", detail: "Ask new patients which treatment they want so your front desk calls with the right answer." },
        { title: "Reply within 10 minutes", detail: "Leads contacted inside 10 minutes book far more often. We will set up an instant WhatsApp reply." },
      ],
      plans: [
        { name: "October offer launch", window: "10 to 31 Oct", detail: "Limited consultation offer on Meta with two new creatives." },
        { name: "Brand search expansion", window: "Oct to Dec", detail: "Capture people searching for Northstar after seeing the ads." },
        { name: "Year-end retargeting", window: "Nov to Dec", detail: "Re-engage people who enquired but did not book." },
      ],
      goals: [
        { label: "Qualified leads this month", target: 260, current: 63, unit: "count" },
        { label: "Cost per lead", target: 4000, current: 3952, unit: "currency", lowerIsBetter: true },
        { label: "Booked consultations", target: 70, current: 18, unit: "count" },
        { label: "Return on ad spend", target: 7, current: 8.2, unit: "ratio" },
      ],
      internalDiscussion: "Debated raising fee to ₦450k at renewal. Hold until ROAS stays above 7 for two months." },
    { clientId: "c_fika", title: "Creator-led launch plan", updated: "2026-09-12", summary: "Use 12 food creators to drive first-month sales of the new range.",
      recommendations: [{ title: "Whitelist the top two creators", detail: "Run their posts as ads to reach beyond their followers." }],
      plans: [{ name: "Creator wave 1", window: "Sep to Oct", detail: "Six creators post recipes using the new range." }],
      goals: [{ label: "Orders from creator codes", target: 600, current: 214, unit: "count" }],
      internalDiscussion: "Consider dropping two creators with low engagement." },
  ];

  const reports: T.Report[] = [
    { id: "r1", clientId: "c_northstar", title: "September performance report", cadence: "Monthly", periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "Published", summary: "Leads grew week on week and cost per lead fell as testimonial ads took a bigger share of budget.", highlights: ["Best month for leads since launch", "Testimonial ads had the lowest cost per lead", "Tracking fully verified on 18 Sep"], reviewNotes: "" },
    { id: "r2", clientId: "c_northstar", title: "Week of 28 Sep", cadence: "Weekly", periodStart: "2026-09-28", periodEnd: "2026-10-04", status: "Published", summary: "Steady week. Spend paced on plan and lead quality held.", highlights: ["63 leads", "Two new creatives ready for your review"], reviewNotes: "" },
    { id: "r3", clientId: "c_northstar", title: "August performance report", cadence: "Monthly", periodStart: "2026-08-01", periodEnd: "2026-08-31", status: "Published", summary: "First full month after the account restructure.", highlights: ["Account restructured into three campaigns", "Cost per lead down from July"], reviewNotes: "" },
    { id: "r4", clientId: "c_northstar", title: "October performance report", cadence: "Monthly", periodStart: "2026-10-01", periodEnd: "2026-10-31", status: "Draft", summary: "Draft, not reviewed.", highlights: [], reviewNotes: "Numbers not reconciled with CRM yet." },
    { id: "r5", clientId: "c_fika", title: "September creator report", cadence: "Monthly", periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "Published", summary: "Creator codes drove 214 orders.", highlights: ["@ChefTemi top performer"], reviewNotes: "" },
  ];

  const onboarding: T.OnboardingItem[] = [
    ["info", "Business and growth brief", "Your goals, offers and customer profile", true, "2026-09-01"],
    ["info", "Kickoff call", "Held 02 Sep with Ada and the front desk lead", true, "2026-09-02"],
    ["info", "October offer details", "Confirm the offer, price and expiry date", false],
    ["access", "Meta Business Manager", "Partner access to Leadhaus Studios", true, "2026-09-03"],
    ["access", "Ad account", "Admin access on the Northstar ad account", true, "2026-09-03"],
    ["access", "Facebook Page and Instagram", "Advertiser access", true, "2026-09-03"],
    ["access", "Pixel and Conversions API", "Dataset shared with Leadhaus", true, "2026-09-04"],
    ["access", "Google Analytics 4", "Editor access", true, "2026-09-05"],
    ["access", "Google Tag Manager", "Publish access to the website container", false],
    ["access", "Google Ads", "Admin access for brand search", true, "2026-09-15"],
    ["access", "Website CMS", "Editor login for landing page updates", false],
    ["asset", "Logo and brand guidelines", "SVG logo and brand PDF", true, "2026-09-02"],
    ["asset", "Product and clinic photography", "JPG, PNG or MP4, up to 250 MB each", false],
    ["asset", "Patient testimonials", "Signed consent forms with each video", true, "2026-09-10"],
  ].map((r, i) => ({ id: `ob${i + 1}`, clientId: "c_northstar", kind: r[0] as T.OnboardingItem["kind"], label: r[1] as string, detail: r[2] as string, done: r[3] as boolean, completedAt: r[4] as string | undefined }));
  onboarding.push({ id: "ob99", clientId: "c_fika", kind: "asset", label: "Product samples shipped to creators", detail: "Courier receipts", done: false });

  const documents: T.Document[] = [
    { id: "doc1", clientId: "c_northstar", title: "Service agreement", kind: "Contract", date: "2026-08-28", visibility: "client", body: ["This agreement covers Ads Management for Northstar Wellness from 1 September 2026.","Leadhaus Studios will plan, launch and optimise paid campaigns on Meta and Google, produce agreed creatives and report weekly and monthly.","Fee: ₦350,000 per month, invoiced on the 1st and due within 7 days. Ad spend is paid directly by Northstar to the platforms.","Either party may end the agreement with 30 days written notice."] },
    { id: "doc2", clientId: "c_northstar", title: "Growth proposal", kind: "Proposal", date: "2026-08-20", visibility: "client", body: ["Goal: more booked consultations at under ₦4,000 per lead.","Approach: testimonial-led Meta campaigns, brand search on Google, and fast WhatsApp follow-up.","Investment: ₦150,000 one-off setup, then ₦350,000 per month."] },
    { id: "doc3", clientId: "c_northstar", title: "INV-2026-011, October retainer", kind: "Invoice", date: "2026-10-01", visibility: "client", body: ["Invoice INV-2026-011 for the October retainer.","Amount: ₦350,000. Due 8 October 2026.","Pay by bank transfer and use the invoice number as the reference."] },
    { id: "doc4", clientId: "c_northstar", title: "Brand guidelines", kind: "Brand", date: "2026-09-02", visibility: "client", body: ["Logo: use the full-colour logo on light backgrounds and the white logo on photos.","Colours: Northstar teal and warm white.","Tone: calm, expert, reassuring."] },
    { id: "doc5", clientId: "c_northstar", title: "September performance report", kind: "Report", date: "2026-10-02", visibility: "client", body: ["Leads grew week on week and cost per lead fell as testimonial ads took a bigger share of budget.","Tracking was fully verified on 18 September."] },
    { id: "doc6", clientId: "c_northstar", title: "Pricing and margin workings", kind: "Other", date: "2026-08-19", visibility: "internal", body: ["Internal pricing and margin workings."] },
    { id: "doc7", clientId: "c_fika", title: "Creator campaign agreement", kind: "Contract", date: "2026-09-05", visibility: "client", body: ["Creator campaign agreement for Fika Foods, phase 1."] },
  ];

  const messages: T.Message[] = [
    { id: "m1", clientId: "c_northstar", kind: "Announcement", from: "Leadhaus Studios", fromRole: "admin", body: "Your new client portal is live. Approvals, reports and invoices now live here instead of email.", at: "2026-10-01T09:00:00Z", visibility: "client" },
    { id: "m2", clientId: "c_northstar", kind: "Update", from: "Oma", fromRole: "admin", body: "September report is ready. The testimonial ads are doing the heavy lifting, so we have two new versions for you to review.", at: "2026-10-02T09:42:00Z", visibility: "client" },
    { id: "m3", clientId: "c_northstar", kind: "Question", from: "Ada Nwosu", fromRole: "client", body: "Can we run the October offer for existing patients too?", at: "2026-10-03T14:10:00Z", visibility: "client" },
    { id: "m4", clientId: "c_northstar", kind: "Update", from: "Dare", fromRole: "admin", body: "Internal: hold reply until we check margin on the extra audience.", at: "2026-10-03T15:00:00Z", visibility: "internal" },
    { id: "m5", clientId: "c_fika", kind: "Update", from: "Fareedah", fromRole: "admin", body: "First creator drafts are in for review.", at: "2026-10-01T11:00:00Z", visibility: "client" },
  ];

  const tasks: T.Task[] = [
    { id: "t1", clientId: "c_northstar", title: "Review testimonial cut V2", owner: "Ada Nwosu", assignee: "client", due: "2026-10-06", status: "Open", clientVisible: true, link: "/portal/creative", relatesTo: "cr1" },
    { id: "t2", clientId: "c_northstar", title: "Confirm October offer details", owner: "Ada Nwosu", assignee: "client", due: "2026-10-07", status: "Open", clientVisible: true, link: "/portal/onboarding", relatesTo: "ob3" },
    { id: "t3", clientId: "c_northstar", title: "Grant Google Tag Manager access", owner: "Ada Nwosu", assignee: "client", due: "2026-10-09", status: "Open", clientVisible: true, link: "/portal/onboarding", relatesTo: "ob9" },
    { id: "t4", clientId: "c_northstar", title: "Build October landing page", owner: "Fareedah", assignee: "agency", due: "2026-10-09", status: "In progress", clientVisible: true },
    { id: "t5", clientId: "c_northstar", title: "Chase Tolu on regrade, negotiate fee", owner: "Dare", assignee: "agency", due: "2026-10-05", status: "Open", clientVisible: false },
    { id: "t6", clientId: "c_fika", title: "Review creator drafts", owner: "Zainab Bello", assignee: "client", due: "2026-10-06", status: "Open", clientVisible: true, link: "/portal/creative", relatesTo: "cr4" },
    { id: "t7", clientId: "c_fika", title: "Renegotiate creator scope", owner: "Fareedah", assignee: "agency", due: "2026-10-10", status: "Open", clientVisible: false },
  ];

  const invoices: T.Invoice[] = [
    { id: "i1", clientId: "c_northstar", number: "INV-2026-011", description: "October retainer", amount: 350000, issued: "2026-10-01", due: "2026-10-08", status: "Unpaid" },
    { id: "i2", clientId: "c_northstar", number: "INV-2026-009", description: "September retainer", amount: 350000, issued: "2026-09-01", due: "2026-09-08", status: "Paid", paidAt: "2026-09-04", method: "Bank transfer" },
    { id: "i3", clientId: "c_northstar", number: "INV-2026-006", description: "Onboarding and tracking setup", amount: 150000, issued: "2026-08-28", due: "2026-09-04", status: "Paid", paidAt: "2026-08-30", method: "Bank transfer" },
    { id: "i4", clientId: "c_fika", number: "INV-2026-010", description: "Creator campaign, phase 1", amount: 280000, issued: "2026-09-08", due: "2026-09-22", status: "Overdue" },
  ];

  const leads: T.Lead[] = [
    { id: "l1", company: "Olive & Oak Interiors", contact: "Amaka Okafor", source: "Website", stage: "Qualified", value: 850000, score: "HOT", owner: "Oma", nextAction: "Send discovery notes" },
    { id: "l2", company: "Meridian Health Group", contact: "Tunde Adebayo", source: "Referral", stage: "Proposal Sent", value: 1400000, score: "HOT", owner: "Dare", nextAction: "Follow up 7 Oct" },
    { id: "l3", company: "Kola Kitchens", contact: "Ifeoma Eze", source: "Instagram", stage: "Call Booked", value: 620000, score: "WARM", owner: "Fareedah", nextAction: "Call 8 Oct" },
    { id: "l4", company: "Brightpath Schools", contact: "Segun Lawal", source: "Meta", stage: "New Lead", value: 400000, score: "LOW", owner: "Oma", nextAction: "First contact" },
    { id: "l5", company: "Lagos Lift Gym", contact: "Kemi Ade", source: "Outbound", stage: "Contacted", value: 300000, score: "WARM", owner: "Dare", nextAction: "Send case study" },
  ];

  const collaboratorPayments: T.CollaboratorPayment[] = [
    { id: "cp_1", clientId: "c_northstar", collaborator: "Tolu (video editor)", description: "Testimonial cut", amount: 85000, status: "Pending" },
    { id: "cp_2", clientId: "c_fika", collaborator: "@ChefTemi", description: "Creator fee", amount: 150000, status: "Paid" },
    { id: "cp_3", clientId: "c_fika", collaborator: "@NaijaEats", description: "Creator fee", amount: 120000, status: "Pending" },
  ];

  const uploads: T.Upload[] = [];
  const audit: T.AuditEvent[] = [];

  return { settings, users, clients, campaigns, metrics, projects, creatives, strategies, reports, onboarding, documents, messages, tasks, invoices, leads, collaboratorPayments, uploads, audit };
}

export type Store = ReturnType<typeof seed>;

const g = globalThis as unknown as { __leadhausStore?: Store };
export const db: Store = (g.__leadhausStore ??= seed());

// Restores the demo data to its starting state (used by the Reset button and tests).
export function resetStore() {
  Object.assign(db, seed());
}

export function logEvent(actor: string, action: string, clientId?: string) {
  db.audit.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), actor, action, clientId });
}
