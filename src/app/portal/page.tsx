import Link from "next/link";
import { requireClient } from "@/lib/session";
import { Megaphone, ChatCircleText } from "@phosphor-icons/react/dist/ssr";
import { getAccount, getCampaigns, getPerformance, getTasks, getMessages, getCreatives, getAgencyInfo } from "@/lib/portal";
import { PageHeader, Card, SectionTitle, Stat, Status, Row, Empty, btn } from "@/components/ui";
import { WeeklyBars } from "@/components/chart";
import { StageTracker } from "@/components/stage-tracker";
import { money, moneyShort, ratio, change, date, greeting } from "@/lib/format";

export const metadata = { title: "Dashboard" };

function delta(cur: number, prev: number, lowerIsBetter = false) {
  const c = change(cur, prev);
  if (c === null) return { note: undefined, tone: "muted" as const };
  const good = lowerIsBetter ? c < 0 : c > 0;
  return { note: `${c > 0 ? "+" : ""}${c.toFixed(1)}% vs previous 4 weeks`, tone: good ? ("good" as const) : ("bad" as const) };
}

export default async function Dashboard() {
  const me = await requireClient();
  const account = getAccount(me.clientId);
  const agency = getAgencyInfo();
  const on = account.sections;
  const perf = getPerformance(me.clientId);
  const campaigns = getCampaigns(me.clientId);
  const tasks = getTasks(me.clientId).filter((t) => t.assignee === "client");
  const updates = getMessages(me.clientId).filter((m) => m.fromRole === "admin").slice(0, 3);
  const reviews = getCreatives(me.clientId).filter((c) => c.status === "Client review");
  const { current: cur, previous: prev } = perf;
  const greet = greeting();
  const live = campaigns.filter((c) => ["Live", "Optimising"].includes(c.status)).length;

  return (
    <>
      <PageHeader title={`${greet}, ${me.name.split(" ")[0]}.`} sub={`${account.service} with ${account.accountLead} as your account lead. ${live} campaign${live === 1 ? "" : "s"} live right now.`}
        help={[
          "This is your home page. It shows how your campaigns are doing and anything we need from you.",
          "The pink box lists jobs waiting for you. Click Do this now next to any job to go straight to it.",
          "The four numbers compare the last 4 weeks with the 4 weeks before. Green means better, red means worse.",
          "Use the menu on the left (or along the top on a phone) to open the other pages.",
        ]} />

      {agency.announcement && (
        <div role="note" className="mb-6 flex gap-3 rounded-[var(--radius-card)] border border-accent/40 bg-accent-soft p-4 text-sm leading-relaxed">
          <Megaphone size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <p>{agency.announcement}</p>
        </div>
      )}
      {account.onboardingStage !== "Complete" && account.onboardingStage !== "Not Started" && on.onboarding && (
        <Card className="mb-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Getting started</h2>
              <p className="text-sm text-muted">We are setting up your account. Finish your onboarding so we can launch.</p>
            </div>
            <Link href="/portal/onboarding" className={btn.secondary}>Open onboarding</Link>
          </div>
          <StageTracker stage={account.onboardingStage} />
        </Card>
      )}
      {account.welcomeNote && (
        <Card className="mb-6">
          <p className="text-xs text-muted">A note from {account.accountLead}</p>
          <p className="mt-1 leading-relaxed">{account.welcomeNote}</p>
        </Card>
      )}

      {(tasks.length > 0 || reviews.length > 0) && (
        <Card className="mb-6 border-accent/40 bg-accent-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold">{tasks.length ? `${tasks.length} job${tasks.length === 1 ? "" : "s"} waiting for you` : "Creatives waiting for you"}</h2>
              <p className="mt-1 text-sm text-muted">Each one takes a minute and keeps your campaigns on schedule.</p>
            </div>
            {reviews.length > 0 && on.creative && <Link href="/portal/creative" className={btn.primary}>Review creatives</Link>}
          </div>
          <ul className="mt-4 divide-y divide-line/70">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="min-w-0">{t.title}<span className="num block text-xs text-muted">Due {date(t.due)}</span></span>
                {t.link && on[t.link.split("/")[2] as keyof typeof on] && <Link href={t.link} className={btn.small}>Do this now</Link>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <h2 className="sr-only">Last 4 weeks</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Leads, last 4 weeks" value={String(cur.leads)} {...delta(cur.leads, prev.leads)} />
        <Stat label="Cost per lead" value={money(Math.round(cur.cpl))} {...delta(cur.cpl, prev.cpl, true)} />
        <Stat label="Ad spend" value={moneyShort(cur.spend)} note={perf.budget ? `${Math.round((cur.spend / perf.budget) * 100)}% of monthly budget` : "No campaign budget set yet"} />
        <Stat label="Return on ad spend" value={ratio(cur.roas)} {...delta(cur.roas, prev.roas)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionTitle aside={on.reports && <Link href="/portal/reports" className="text-xs text-accent hover:underline">All reports</Link>}>Leads per week</SectionTitle>
          <WeeklyBars rows={perf.weeks} metric="leads" label="Leads" format={String} />
          <p className="mt-4 text-xs text-muted">Revenue attributed to ads in the last 4 weeks: <span className="num text-text">{money(cur.revenue)}</span></p>
        </Card>
        <Card>
          <SectionTitle aside={on.messages && <Link href="/portal/messages" className="text-xs text-accent hover:underline">All messages</Link>}>Latest from your team</SectionTitle>
          {updates.length ? (
            <ul className="space-y-4">
              {updates.map((m) => (
                <li key={m.id}>
                  <p className="text-xs text-muted">{m.kind} from {m.from}, {date(m.at)}</p>
                  <p className="mt-1 text-sm leading-relaxed">{m.body}</p>
                </li>
              ))}
            </ul>
          ) : <Empty title="No updates yet" body="Your account lead will post updates here." />}
          <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-xs leading-relaxed text-muted">
            <ChatCircleText size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>Need help? {on.messages ? "Message us here or email" : "Email"} {agency.supportEmail}. WhatsApp {agency.supportWhatsApp}. We reply {agency.replyPromise}.</span>
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <SectionTitle aside={on.projects && <Link href="/portal/projects" className="text-xs text-accent hover:underline">Projects</Link>}>Campaigns</SectionTitle>
        <div className="divide-y divide-line">
          {campaigns.map((c) => (
            <Row key={c.id}>
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="mt-0.5 text-xs text-muted">{c.platform}, {date(c.start)} to {date(c.end)}</p>
              </div>
              <Status value={c.status} />
            </Row>
          ))}
        </div>
      </Card>
    </>
  );
}
