import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/admin";
import { PageHeader, Card } from "@/components/ui";

export const metadata = { title: "Team" };

export default async function Team() {
  await requireAdmin();
  const team = db.users.filter((u) => u.role === "admin");
  return (
    <>
      <PageHeader title="Team" sub="Who owns what across clients and leads."
        help={["Each card is one team member: how many clients they lead, their open tasks and the leads they follow up.", "To give someone a task, go to Delivery and use Add a task."]} />
      <div className="grid gap-6 md:grid-cols-3">
        {team.map((u) => {
          const tasks = db.tasks.filter((t) => t.owner === u.name && t.status !== "Done");
          const accounts = db.clients.filter((c) => c.accountLead === u.name);
          const leads = db.leads.filter((l) => l.owner === u.name && !["Won", "Lost"].includes(l.stage));
          return (
            <Card key={u.id}>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-accent-soft font-semibold text-accent">{u.name.slice(0, 2).toUpperCase()}</span>
                <div><h2 className="font-semibold">{u.name}</h2><p className="text-xs text-muted">{u.title}</p></div>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[var(--radius-ctl)] bg-surface-2 py-3"><dd className="num text-lg font-semibold">{accounts.length}</dd><dt className="text-[11px] text-muted">Accounts</dt></div>
                <div className="rounded-[var(--radius-ctl)] bg-surface-2 py-3"><dd className="num text-lg font-semibold">{tasks.length}</dd><dt className="text-[11px] text-muted">Open tasks</dt></div>
                <div className="rounded-[var(--radius-ctl)] bg-surface-2 py-3"><dd className="num text-lg font-semibold">{leads.length}</dd><dt className="text-[11px] text-muted">Leads</dt></div>
              </dl>
              {tasks.length > 0 && <ul className="mt-4 space-y-1.5 text-sm text-muted">{tasks.map((t) => <li key={t.id} className="truncate">{t.title}</li>)}</ul>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
