import { date } from "@/lib/format";

// Weekly bars with an accessible data table fallback. Single series keeps
// the accent lock; the label row carries the values.

export function WeeklyBars({ rows, metric, label, format }: { rows: { weekStart: string; spend: number; leads: number; revenue: number }[]; metric: "spend" | "leads" | "revenue"; label: string; format: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r[metric]), 1);
  return (
    <figure>
      <div className="flex h-40 items-end gap-2" aria-hidden>
        {rows.map((r, i) => (
          <div key={r.weekStart} className="group flex h-full flex-1 flex-col justify-end">
            <div
              className={`rounded-t-[4px] ${i === rows.length - 1 ? "bg-accent" : "bg-accent/35"} transition group-hover:bg-accent`}
              style={{ height: `${Math.max(4, (r[metric] / max) * 100)}%` }}
              title={`${date(r.weekStart)}: ${format(r[metric])}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-[10px] text-muted" aria-hidden>
        {rows.map((r) => (
          <span key={r.weekStart} className="num flex-1 text-center">{date(r.weekStart)}</span>
        ))}
      </div>
      <figcaption className="sr-only">
        {label} by week:
        <table>
          <tbody>
            {rows.map((r) => (
              <tr key={r.weekStart}><th>{date(r.weekStart)}</th><td>{format(r[metric])}</td></tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
