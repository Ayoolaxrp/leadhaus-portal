import { requireAdmin } from "@/lib/session";
import { clientName, db } from "@/lib/admin";
import { shareCreative, publishReport, addTask, completeTask } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader, Card, SectionTitle, Status, Progress, Badge, btn, field } from "@/components/ui";
import { date, money } from "@/lib/format";

export const metadata = { title: "Delivery" };

export default async function Delivery() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Delivery" sub="Projects, tasks, creative approvals and reports across every client."
        help={["Creatives: click Send to client when a piece is ready. It appears on the client Creative approval page and on their to-do list.", "Tasks: use Add a task to create one. Tick Client can see this if the client should see it. Click Done when it is finished.", "Reports: drafts are hidden from the client. Click Publish to share one."]} />

      <div className="grid gap-6 lg:grid-cols-3">
        {db.projects.map((p) => (
          <Card key={p.id}>
            <p className="text-xs text-muted">{clientName(p.clientId)}</p>
            <h2 className="font-semibold tracking-tight">{p.name}</h2>
            <p className="mb-4 text-xs text-muted">Owner {p.owner}, ends {date(p.end)}</p>
            <Progress value={p.progress} label="Progress" />
            {p.capacityNote && <p className="mt-3 text-xs text-warn">Internal: {p.capacityNote}</p>}
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <SectionTitle>Creatives</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="pb-3 font-normal">Creative</th><th className="pb-3 font-normal">Client</th><th className="pb-3 font-normal">Made by</th><th className="pb-3 font-normal">Cost</th><th className="pb-3 font-normal">Status</th><th className="pb-3" /></tr></thead>
            <tbody className="divide-y divide-line">
              {db.creatives.map((c) => (
                <tr key={c.id}>
                  <td className="py-3"><p className="font-medium">{c.title}</p><p className="text-xs text-muted">V{c.versions.length}, {c.comments.filter((m) => m.internal).length} internal notes</p></td>
                  <td className="py-3 text-muted">{clientName(c.clientId)}</td>
                  <td className="py-3 text-muted">{c.designer}</td>
                  <td className="num py-3 text-muted">{c.productionCost ? money(c.productionCost) : "In-house"}</td>
                  <td className="py-3"><Status value={c.status} /></td>
                  <td className="py-3 text-right">
                    {["Internal review", "Revision requested"].includes(c.status) && (
                      <form action={shareCreative}><input type="hidden" name="creativeId" value={c.id} /><button className={btn.small}>Send to client</button></form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Tasks</SectionTitle>
          <details className="mb-4 rounded-[var(--radius-ctl)] border border-line">
            <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-accent">Add a task</summary>
            <ActionForm action={addTask} success="Task added." className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label htmlFor="title" className="mb-1.5 block text-xs text-muted">What needs doing</label><input id="title" name="title" className={field} required /></div>
              <div><label htmlFor="t-client" className="mb-1.5 block text-xs text-muted">Client</label><select id="t-client" name="clientId" className={field}>{db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label htmlFor="t-due" className="mb-1.5 block text-xs text-muted">Due date</label><input id="t-due" name="due" type="date" className={field} required /></div>
              <div><label htmlFor="t-assignee" className="mb-1.5 block text-xs text-muted">Who does it</label><select id="t-assignee" name="assignee" className={field}><option value="agency">Leadhaus team</option><option value="client">The client</option></select></div>
              <div><label htmlFor="t-owner" className="mb-1.5 block text-xs text-muted">Team member</label><select id="t-owner" name="owner" className={field}>{db.users.filter((u) => u.role === "admin").map((u) => <option key={u.id}>{u.name}</option>)}</select></div>
              <label className="flex items-center gap-2 text-xs text-muted sm:col-span-2"><input type="checkbox" name="visible" className="accent-[var(--accent)]" /> Client can see this</label>
              <div className="sm:col-span-2"><button className={btn.primary}>Save task</button></div>
            </ActionForm>
          </details>
          <ul className="divide-y divide-line">
            {db.tasks.filter((t) => t.status !== "Done").map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0"><p className="truncate">{t.title}</p><p className="text-xs text-muted">{clientName(t.clientId)}, {t.owner}</p></div>
                <div className="flex shrink-0 items-center gap-2">{!t.clientVisible && <Badge tone="warn">Internal</Badge>}{t.assignee === "client" && <Badge>Client to do</Badge>}<span className="num text-xs text-muted">{date(t.due)}</span>
                  <form action={completeTask}><input type="hidden" name="taskId" value={t.id} /><button className={btn.small}>Done</button></form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle>Reports</SectionTitle>
          <ul className="divide-y divide-line">
            {db.reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0"><p className="truncate">{r.title}</p><p className="text-xs text-muted">{clientName(r.clientId)}{r.reviewNotes && `, ${r.reviewNotes}`}</p></div>
                {r.status === "Draft" ? (
                  <form action={publishReport}><input type="hidden" name="reportId" value={r.id} /><button className={btn.small}>Publish</button></form>
                ) : <Status value={r.status} />}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
