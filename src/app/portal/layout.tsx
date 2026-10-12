import { Shell, type NavItem } from "@/components/shell";
import { requireClient } from "@/lib/session";
import { signOut } from "@/lib/actions";
import { getAccount, getCreatives, getOnboarding, getInvoices } from "@/lib/portal-runtime";

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const me = await requireClient();
  const [account, creatives, onboarding, invoices] = await Promise.all([getAccount(me), getCreatives(me), getOnboarding(me), getInvoices(me)]);
  const reviews = creatives.filter((c) => c.status === "Client review").length;
  const onboardingOpen = onboarding.items.filter((i) => !i.done).length;
  const unpaid = invoices.filter((i) => i.status !== "Paid").length;
  const sections = account.sections as Record<string, boolean>;
  const nav: NavItem[] = ([
    { href: "/portal", label: "Dashboard", icon: "SquaresFour" },
    { href: "/portal/projects", label: "Projects", icon: "Kanban" },
    { href: "/portal/creative", label: "Creative approval", icon: "ImageSquare", badge: reviews },
    { href: "/portal/strategy", label: "Strategy", icon: "Compass" },
    { href: "/portal/reports", label: "Reports", icon: "ChartBar" },
    { href: "/portal/onboarding", label: "Onboarding", icon: "ListChecks", badge: onboardingOpen },
    { href: "/portal/documents", label: "Documents", icon: "FileText" },
    { href: "/portal/messages", label: "Messages", icon: "ChatCircleText" },
    { href: "/portal/billing", label: "Billing", icon: "Receipt", badge: unpaid },
  ] as NavItem[]).filter((n) => n.href === "/portal" || sections[n.href.split("/")[2]]);
  return (
    <Shell nav={nav} workspace={account.name} workspaceLabel="Client portal" user={me} signOut={signOut} demo={process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL}>
      {children}
    </Shell>
  );
}
