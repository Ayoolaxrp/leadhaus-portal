import { Shell, type NavItem } from "@/components/shell";
import { requireAdmin } from "@/lib/session";
import { signOut } from "@/lib/actions";
import { getAdminData } from "@/lib/admin-runtime";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const me = await requireAdmin();
  const db = await getAdminData();
  const questions = db.messages.filter((m) => m.kind === "Question" && m.fromRole === "client" && !m.answered).length;
  const overdue = db.invoices.filter((i) => i.status === "Overdue").length;
  const nav: NavItem[] = [
    { href: "/admin", label: "Overview", icon: "SquaresFour" },
    { href: "/admin/inbox", label: "Inbox", icon: "ChatsCircle", badge: questions },
    { href: "/admin/leads", label: "Leads", icon: "Funnel" },
    { href: "/admin/clients", label: "Clients", icon: "Buildings" },
    { href: "/admin/delivery", label: "Delivery", icon: "CheckSquare" },
    { href: "/admin/finance", label: "Finance", icon: "Wallet", badge: overdue },
    { href: "/admin/team", label: "Team", icon: "UsersThree" },
    { href: "/admin/settings", label: "Settings", icon: "GearSix" },
  ];
  return (
    <Shell nav={nav} workspace="Leadhaus Studios" workspaceLabel="Agency workspace" user={me} signOut={signOut} demo={process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL}>
      {children}
    </Shell>
  );
}
