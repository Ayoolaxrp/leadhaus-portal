import { requireClient } from "@/lib/session";
import { getStrategy } from "@/lib/portal-runtime";
import { requireSection } from "@/lib/portal-guard";
import { PageHeader, Card, Empty, Badge } from "@/components/ui";
import { date, money, ratio } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Strategy" };

const fmt = (n: number, unit: "count" | "currency" | "ratio") => (unit === "currency" ? money(n) : unit === "ratio" ? ratio(n) : String(n));

export default async function Strategy() {
  const me = await requireClient();
  await requireSection(me.clientId, "strategy");
  const s = await getStrategy(me);
  if (!s) return (<><PageHeader title="Strategy" /><Empty title="Strategy in progress" body="Your growth strategy will appear here after the kickoff call." /></>);

  return (
    <>
      <PageHeader title={s.title} sub={`Updated ${date(s.updated, { day: "numeric", month: "long", year: "numeric" })}`}
        help={["This is the plan we are following for your business, in plain words.", "Goals and KPIs show your targets. On target means we have hit it. In progress means we are working towards it.", "Have a question about the plan? Ask it on the Messages page."]}
        action={<PrintButton />} />
      <p className="max-w-[68ch] text-[17px] leading-relaxed">{s.summary}</p>

      <h2 className="mt-10 mb-3 text-[15px] font-semibold">Goals and KPIs</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {s.goals.map((g) => {
          const hit = g.lowerIsBetter ? g.current <= g.target : g.current >= g.target;
          return (
            <Card key={g.label}>
              <p className="text-xs text-muted">{g.label}</p>
              <p className="num mt-2 text-2xl font-semibold tracking-tight">{fmt(g.current, g.unit)}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="num text-xs text-muted">Target {g.lowerIsBetter ? "under " : ""}{fmt(g.target, g.unit)}</p>
                <Badge tone={hit ? "good" : "muted"}>{hit ? "On target" : "In progress"}</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Our recommendations</h2>
          <ol className="space-y-5">
            {s.recommendations.map((r, i) => (
              <li key={r.title} className="grid grid-cols-[2rem_1fr] gap-2">
                <span className="num text-sm font-semibold text-accent">{i + 1}</span>
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{r.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Campaign plan</h2>
          <Card className="divide-y divide-line p-0">
            {s.plans.map((p) => (
              <div key={p.name} className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs whitespace-nowrap text-muted">{p.window}</p>
                </div>
                <p className="mt-1 text-sm text-muted">{p.detail}</p>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </>
  );
}
