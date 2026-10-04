// Internal records. These carry agency-only fields and must never be
// serialized to a client portal user directly. See src/lib/portal.ts for
// the client-safe projections.

export type Role = "client" | "admin";

export const PORTAL_SECTIONS = ["projects", "creative", "strategy", "reports", "onboarding", "documents", "messages", "billing"] as const;
export type PortalSection = (typeof PORTAL_SECTIONS)[number];

// Agency-wide settings. Everything here is shown to clients somewhere.
export type AgencySettings = {
  agencyName: string;
  supportEmail: string;
  supportWhatsApp: string;
  replyPromise: string;
  bank: { bank: string; accountName: string; accountNumber: string };
  announcement: string; // banner on every client dashboard; empty = none
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId?: string; // required for role "client"
  title?: string;
};

export type Client = {
  id: string;
  name: string;
  service: string;
  status: "Onboarding" | "Active" | "Paused" | "Completed" | "Churned";
  accountLead: string;
  contactName: string;
  currency: "NGN";
  monthlyFee: number;
  renewalDate: string;
  // portal settings the team controls
  sections: Record<PortalSection, boolean>;
  welcomeNote: string;
  // internal only
  health: "Healthy" | "Attention" | "At Risk";
  marginPct: number;
  internalNotes: string;
};

export type Campaign = {
  id: string;
  clientId: string;
  name: string;
  platform: string;
  objective: string;
  status: "Planning" | "Awaiting Approval" | "Live" | "Optimising" | "Paused" | "Completed";
  start: string;
  end: string;
  monthlyBudget: number;
  // internal only
  internalNotes: string;
};

export type WeeklyMetric = {
  clientId: string;
  weekStart: string;
  spend: number;
  leads: number;
  revenue: number;
};

export type Deliverable = {
  id: string;
  title: string;
  due: string;
  status: "Planned" | "In progress" | "Client review" | "Delivered";
};

export type Project = {
  id: string;
  clientId: string;
  name: string;
  type: string;
  start: string;
  end: string;
  progress: number;
  deliverables: Deliverable[];
  // internal only
  owner: string;
  capacityNote: string;
};

export type Comment = {
  id: string;
  author: string;
  authorRole: Role;
  body: string;
  at: string;
  internal: boolean; // internal review commentary, never shown to clients
};

export type Creative = {
  id: string;
  clientId: string;
  title: string;
  format: string;
  platform: string;
  status: "Internal review" | "Client review" | "Revision requested" | "Approved";
  versions: { version: number; image: string; createdAt: string }[];
  comments: Comment[];
  decidedBy?: string;
  decidedAt?: string;
  // internal only
  designer: string;
  productionCost: number;
};

export type Strategy = {
  clientId: string;
  title: string;
  updated: string;
  summary: string;
  recommendations: { title: string; detail: string }[];
  plans: { name: string; window: string; detail: string }[];
  goals: { label: string; target: number; current: number; unit: "count" | "currency" | "ratio"; lowerIsBetter?: boolean }[];
  // internal only
  internalDiscussion: string;
};

export type Report = {
  id: string;
  clientId: string;
  title: string;
  cadence: "Weekly" | "Monthly";
  periodStart: string;
  periodEnd: string;
  status: "Draft" | "Published";
  summary: string;
  highlights: string[];
  // internal only
  reviewNotes: string;
};

export type OnboardingItem = {
  id: string;
  clientId: string;
  kind: "info" | "access" | "asset";
  label: string;
  detail: string;
  done: boolean;
  completedAt?: string;
};

export type Upload = {
  id: string;
  clientId: string;
  name: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
};

export type Document = {
  id: string;
  clientId: string;
  title: string;
  kind: "Contract" | "Proposal" | "Invoice" | "Report" | "Brand" | "Other";
  date: string;
  visibility: "client" | "internal";
  body: string[];
};

export type Message = {
  id: string;
  clientId: string;
  kind: "Update" | "Question" | "Announcement";
  from: string;
  fromRole: Role;
  body: string;
  at: string;
  visibility: "client" | "internal";
  answered?: boolean; // client questions: true once the team replies
};

export type Task = {
  id: string;
  clientId: string;
  title: string;
  owner: string;
  assignee: "client" | "agency";
  due: string;
  status: "Open" | "In progress" | "Done";
  clientVisible: boolean;
  link?: string; // where in the portal the client completes it
  relatesTo?: string; // creative or onboarding item id; closes the task when that item is done
};

export type Invoice = {
  id: string;
  clientId: string;
  number: string;
  description: string;
  amount: number;
  issued: string;
  due: string;
  status: "Paid" | "Unpaid" | "Overdue";
  paidAt?: string;
  method?: string;
  clientMarkedPaidAt?: string; // client clicked "I have paid"; team confirms
};

export type Lead = {
  id: string;
  company: string;
  contact: string;
  source: string;
  stage: "New Lead" | "Contacted" | "Qualified" | "Call Booked" | "Proposal Sent" | "Negotiation" | "Won" | "Lost";
  value: number;
  score: "HOT" | "WARM" | "LOW";
  owner: string;
  nextAction: string;
};

export type CollaboratorPayment = {
  id: string;
  clientId: string;
  collaborator: string;
  description: string;
  amount: number;
  status: "Paid" | "Pending";
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  clientId?: string;
};
