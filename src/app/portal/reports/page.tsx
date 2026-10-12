import { requireClient } from "@/lib/session";
import { getReports, getPerformance } from "@/lib/portal-runtime";
import { requireSection } from "@/lib/portal-guard";
import { PageHeader, Card, SectionTitle, Badge, Empty } from "@/components/ui";
import { WeeklyBars } from "@/components/chart";
import { PrintButton } from "@/components/print-button";
import { date, money, moneyShort, ratio } from "@/lib/format";

export const metadata = { title: "Reports" };

export default async function Reports() {
  const me = await requireClient();
  await requireSection(me.clientId, "reports");
  const [reports, perf] = await Promise.all([getReports(me), getPerformance(me)]);
  const [latest, ...older] = reports;

  return (
    <>
      <PageHeader title="Reports" sub="Weekly and monthly results, with every past report kept here."
        help={["The two charts show each week of the last 8 weeks. The bright bar is the most recent week.", "The Latest box is your newest report. Older reports are listed underneath: click Open to read one.", "Click Print or save as PDF to keep a copy."]}
        action={<PrintButton />} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle aside={<span className="num text-xs text-muted">{moneyShort(perf.current.spend)} last 4 weeks</span>}>Ad spend per week</SectionTitle>
          <WeeklyBars rows={perf.weeks} metric="spend" label="Ad spend" format={moneyShort} />
        </Card>
        <Card>
          <SectionTitle aside={<span className="num text-xs text-muted">{ratio(perf.current.roas)} return on ad spend</span>}>Attributed revenue per week</SectionTitle>
          <WeeklyBars rows={perf.weeks} metric="revenue" label="Attributed revenue" format={moneyShort} />
        </Card>
      </div>

      {!latest ? (
        <div className="mt-6"><Empty title="Your first report is on the way" body="We publish a weekly summary every Monday and a full report at month end." /></div>
      ) : (
        <>
          <Card className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Latest</Badge>
              <Badge>{latest.cadence}</Badge>
              <span className="num text-xs text-muted">{date(latest.periodStart)} to {date(latest.periodEnd, { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">{latest.title}</h2>
            <p className="mt-2 max-w-[68ch] leading-relaxed text-muted">{latest.summary}</p>
            {latest.highlights.length > 0 && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                {latest.highlights.map((h) => <li key={h} className="rounded-[var(--radius-ctl)] bg-surface-2 px-3 py-2.5 text-sm">{h}</li>)}
              </ul>
            )}
          </Card>

          <h2 className="mt-10 mb-3 text-[15px] font-semibold">Previous reports</h2>
          <Card className="divide-y divide-line p-0">
            {older.map((r) => (
              <details key={r.id} className="group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="num text-xs text-muted">{r.cadence}, {date(r.periodStart)} to {date(r.periodEnd)}</p>
                  </div>
                  <span className="text-xs text-accent group-open:hidden">Open</span>
                  <span className="hidden text-xs text-muted group-open:inline">Close</span>
                </summary>
                <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-muted">{r.summary}</p>
                {r.highlights.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm">{r.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
              </details>
            ))}
          </Card>
          <p className="mt-3 text-xs text-muted">Figures cover {money(perf.current.spend)} of spend in the last 4 weeks. Revenue is what your CRM attributes to ads.</p>
        </>
      )}
    </>
  );
}
