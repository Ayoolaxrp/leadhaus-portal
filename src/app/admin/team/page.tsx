import { requireAdmin } from "@/lib/session";
import { getAdminData } from "@/lib/admin-runtime";
import { PageHeader, Card, btn, field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addTeamMember } from "@/lib/actions";

export const metadata = { title: "Team" };

export default async function Team() {
  await requireAdmin();
  const db = await getAdminData();
  const team = db.users.filter((u) => u.role === "admin");
  return (
    <>
      <PageHeader title="Team" sub="Who owns what across clients and leads."
        help={["Each card is one team member: how many clients they lead, their open tasks and the leads they follow up.", "To give someone a task, go to Delivery and use Add a task.", "Use Add a team member to give a colleague access. They get an email with a sign-in link and can then see everything in the team workspace."]} />
      <details className="mb-6 rounded-[var(--radius-card)] border border-line bg-surface">
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-accent">Add a team member</summary>
        <ActionForm action={addTeamMember} success="Invitation sent. They appear below and can sign in from the email." className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
          <div><label htmlFor="tm-name" className="mb-1.5 block text-xs text-muted">Name</label><input id="tm-name" name="name" className={field} required /></div>
          <div><label htmlFor="tm-email" className="mb-1.5 block text-xs text-muted">Email</label><input id="tm-email" name="email" type="email" className={field} required /></div>
          <div><label htmlFor="tm-title" className="mb-1.5 block text-xs text-muted">Role</label><input id="tm-title" name="title" className={field} placeholder="Account Manager" /></div>
          <p className="text-xs text-muted sm:col-span-3">Team members see every client, lead, invoice and internal note. Only add people who work at Leadhaus.</p>
          <div className="sm:col-span-3"><button className={btn.primary}>Send invitation</button></div>
        </ActionForm>
      </details>
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
