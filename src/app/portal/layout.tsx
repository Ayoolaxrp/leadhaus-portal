import { Shell, type NavItem } from "@/components/shell";
import { requireClient } from "@/lib/session";
import { signOut } from "@/lib/actions";
import { getAccount, getCreatives, getOnboarding, getInvoices } from "@/lib/portal";

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const me = await requireClient();
  const account = getAccount(me.clientId);
  const reviews = getCreatives(me.clientId).filter((c) => c.status === "Client review").length;
  const onboardingOpen = getOnboarding(me.clientId).items.filter((i) => !i.done).length;
  const unpaid = getInvoices(me.clientId).filter((i) => i.status !== "Paid").length;
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
  ] as NavItem[]).filter((n) => n.href === "/portal" || account.sections[n.href.split("/")[2] as keyof typeof account.sections]);
  return (
    <Shell nav={nav} workspace={account.name} workspaceLabel="Client portal" user={me} signOut={signOut}>
      {children}
    </Shell>
  );
}
