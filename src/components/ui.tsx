import type { ReactNode } from "react";

export function PageHeader({ title, sub, action, help }: { title: string; sub?: string; action?: ReactNode; help?: string[] }) {
  return (
    <header className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {sub && <p className="mt-1.5 max-w-[60ch] text-sm text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {help && (
        <details className="group mt-4 max-w-[70ch] rounded-[var(--radius-ctl)] border border-line bg-surface text-sm">
          <summary className="cursor-pointer list-none px-4 py-2.5 text-accent marker:hidden">
            <span className="group-open:hidden">How does this page work?</span>
            <span className="hidden group-open:inline">Hide help</span>
          </summary>
          <ul className="list-disc space-y-1.5 px-4 pb-4 pl-8 leading-relaxed text-muted">
            {help.map((h) => <li key={h}>{h}</li>)}
          </ul>
        </details>
      )}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[var(--radius-card)] border border-line bg-surface p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}

export function Stat({ label, value, note, tone = "muted" }: { label: string; value: string; note?: string; tone?: "good" | "bad" | "muted" }) {
  const c = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-muted";
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="num mt-2 text-[26px] font-semibold tracking-tight">{value}</p>
      {note && <p className={`num mt-1 text-xs ${c}`}>{note}</p>}
    </div>
  );
}

const tones: Record<string, string> = {
  good: "bg-good/12 text-good",
  warn: "bg-warn/14 text-warn",
  bad: "bg-bad/12 text-bad",
  accent: "bg-accent-soft text-accent",
  muted: "bg-surface-2 text-muted",
};

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function statusTone(s: string): keyof typeof tones {
  if (/(Live|Optimising|Approved|Delivered|Paid|Published|Done|Healthy|Active|Won|HOT)/.test(s)) return "good";
  if (/(Client review|Awaiting|Your|Revision|Unpaid|Attention|Open|WARM|Proposal|Negotiation)/.test(s)) return "warn";
  if (/(Overdue|At Risk|Lost|Paused)/.test(s)) return "bad";
  if (/(In progress|Call Booked|Qualified)/.test(s)) return "accent";
  return "muted";
}

export function Status({ value }: { value: string }) {
  return <Badge tone={statusTone(value)}>{value}</Badge>;
}

export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label && (
        <div className="mb-2 flex justify-between text-xs text-muted">
          <span>{label}</span>
          <span className="num font-medium text-text">{value}%</span>
        </div>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-[42ch] text-sm text-muted">{body}</p>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">{children}</div>;
}

export const btn = {
  primary: "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-ctl)] bg-accent px-4 text-sm font-medium whitespace-nowrap text-accent-ink transition active:scale-[0.98] hover:brightness-110 disabled:opacity-50",
  secondary: "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-ctl)] border border-line bg-surface px-4 text-sm font-medium whitespace-nowrap transition active:scale-[0.98] hover:bg-surface-2 disabled:opacity-50",
  small: "inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-ctl)] border border-line px-3 text-xs font-medium whitespace-nowrap transition active:scale-[0.98] hover:bg-surface-2",
};

export const field = "w-full rounded-[var(--radius-ctl)] border border-line bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted/80 focus:border-accent focus:outline-none";
