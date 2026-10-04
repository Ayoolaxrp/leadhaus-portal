import { requireClient } from "@/lib/session";
import { getProjects, getCampaigns } from "@/lib/portal";
import { requireSection } from "@/lib/portal-guard";
import { PageHeader, Card, Progress, Status, Empty } from "@/components/ui";
import { date, money } from "@/lib/format";

export const metadata = { title: "Projects" };

export default async function Projects() {
  const me = await requireClient();
  requireSection(me.clientId, "projects");
  const projects = getProjects(me.clientId);
  const campaigns = getCampaigns(me.clientId);

  return (
    <>
      <PageHeader title="Projects" sub="What we are building for you, what is due next and where each piece stands."
        help={["Each box is one project. The pink bar shows how far along it is.", "Deliverables are the pieces of work inside a project. Green means delivered, yellow means it is waiting for your review.", "The table at the bottom lists your ad campaigns and their monthly budget. You do not need to do anything on this page."]} />
      {projects.length === 0 && <Empty title="No active projects" body="Projects appear here once your kickoff is complete." />}
      <div className="grid gap-6 lg:grid-cols-2">
        {projects.map((p) => {
          const next = p.deliverables.find((d) => d.status !== "Delivered");
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{p.name}</h2>
                  <p className="mt-0.5 text-xs text-muted">{p.type}, {date(p.start)} to {date(p.end, { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                {next && <p className="text-right text-xs text-muted">Next due<br /><span className="num text-sm font-medium text-text">{date(next.due)}</span></p>}
              </div>
              <div className="my-5"><Progress value={p.progress} label="Progress" /></div>
              <h3 className="mb-1 text-xs font-medium text-muted">Deliverables</h3>
              <ol className="divide-y divide-line">
                {p.deliverables.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className={`text-sm ${d.status === "Delivered" ? "text-muted" : ""}`}>{d.title}</p>
                      <p className="num text-xs text-muted">{d.status === "Delivered" ? "Delivered" : "Due"} {date(d.due)}</p>
                    </div>
                    <Status value={d.status} />
                  </li>
                ))}
              </ol>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 overflow-x-auto">
        <h2 className="mb-3 text-[15px] font-semibold">Active campaigns</h2>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th className="pb-3 font-normal">Campaign</th><th className="pb-3 font-normal">Objective</th><th className="pb-3 font-normal">Dates</th><th className="pb-3 text-right font-normal">Monthly budget</th><th className="pb-3 text-right font-normal">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td className="py-3"><p className="font-medium">{c.name}</p><p className="text-xs text-muted">{c.platform}</p></td>
                <td className="py-3 text-muted">{c.objective}</td>
                <td className="num py-3 text-muted">{date(c.start)} to {date(c.end)}</td>
                <td className="num py-3 text-right">{money(c.monthlyBudget)}</td>
                <td className="py-3 text-right"><Status value={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
