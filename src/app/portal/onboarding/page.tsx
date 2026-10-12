import { CheckCircle, Circle } from "@phosphor-icons/react/dist/ssr";
import { requireClient } from "@/lib/session";
import { getOnboarding, getAccount } from "@/lib/portal-runtime";
import { requireSection } from "@/lib/portal-guard";
import { completeOnboardingItem, uploadAssets } from "@/lib/actions";
import { PageHeader, Card, Progress, btn, field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { StageTracker } from "@/components/stage-tracker";
import { date, dateTime, fileSize } from "@/lib/format";

export const metadata = { title: "Onboarding" };

const groups = [
  { kind: "info", title: "Information we need" },
  { kind: "access", title: "Account access" },
  { kind: "asset", title: "Brand assets" },
] as const;

export default async function Onboarding() {
  const me = await requireClient();
  await requireSection(me.clientId, "onboarding");
  const [onboarding, account] = await Promise.all([getOnboarding(me), getAccount(me)]);
  const { items, uploads, pct } = onboarding;
  const stage = account.onboardingStage;
  const open = items.filter((i) => !i.done);

  return (
    <>
      <PageHeader title="Onboarding" sub="Everything we need from you to run your campaigns well."
        help={["A green tick means that item is done. An empty circle means we still need it.", "For questions, type your answer and click Send.", "For account access, give Leadhaus access in that tool first, then click I have granted access.", "To send photos, videos or files, click Choose files, pick them from your computer, then click Upload."]} />
      <Card className="mb-4">
        <p className="mb-3 text-xs font-medium text-muted">Where you are</p>
        <StageTracker stage={stage} />
      </Card>
      <Card className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{!items.length ? "Your checklist is on its way" : pct === 100 ? "Setup complete" : `${open.length} item${open.length === 1 ? "" : "s"} left`}</h2>
            <p className="text-sm text-muted">{!items.length ? "Your account lead will send what we need from you shortly." : pct === 100 ? "Thank you. Everything is in place." : "Each one unblocks part of your campaign."}</p>
          </div>
          <div className="sm:w-72"><Progress value={pct} label="Complete" /></div>
        </div>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          {groups.map((g) => {
            const rows = items.filter((i) => i.kind === g.kind);
            if (!rows.length) return null;
            return (
              <section key={g.kind}>
                <h2 className="mb-3 text-[15px] font-semibold">{g.title} <span className="num font-normal text-muted">{rows.filter((r) => r.done).length}/{rows.length}</span></h2>
                <Card className="divide-y divide-line p-0">
                  {rows.map((i) => (
                    <div key={i.id} className="flex gap-3 p-4">
                      {i.done ? <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-good" aria-label="Done" /> : <Circle size={20} className="mt-0.5 shrink-0 text-muted" aria-label="Not done" />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${i.done ? "text-muted" : ""}`}>{i.label}</p>
                        <p className="text-xs text-muted">{i.done && i.completedAt ? `Done ${date(i.completedAt)}` : i.detail}</p>
                        {!i.done && i.kind !== "asset" && (
                          <ActionForm action={completeOnboardingItem} className="mt-3" success="Thanks, your team has been notified.">
                            <input type="hidden" name="itemId" value={i.id} />
                            {i.kind === "info" ? (
                              <>
                                <label htmlFor={`a-${i.id}`} className="mb-1.5 block text-xs text-muted">Your answer</label>
                                <textarea id={`a-${i.id}`} name="answer" rows={2} className={field} />
                                <button className={`${btn.primary} mt-2`}>Send</button>
                              </>
                            ) : (
                              <button className={btn.small}>I have granted access</button>
                            )}
                          </ActionForm>
                        )}
                      </div>
                    </div>
                  ))}
                </Card>
              </section>
            );
          })}
        </div>

        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Upload assets</h2>
          <Card>
            <ActionForm action={uploadAssets} success="Uploaded. Your team can see these now.">
              <label htmlFor="files" className="block cursor-pointer rounded-[var(--radius-ctl)] border border-dashed border-line px-4 py-8 text-center transition hover:border-accent/60">
                <span className="block text-sm font-medium">Add photos, videos or files</span>
                <span className="mt-1 block text-xs text-muted">JPG, PNG, WEBP, MP4, MOV, PDF, SVG or ZIP. Up to 250 MB each.</span>
                <input id="files" name="files" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.pdf,.svg,.zip" className="mt-3 w-full text-xs text-muted file:mr-3 file:rounded-[var(--radius-ctl)] file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text" />
              </label>
              <button className={`${btn.primary} mt-3 w-full`}>Upload</button>
            </ActionForm>
            <h3 className="mt-6 mb-2 text-xs font-medium text-muted">Uploaded</h3>
            {uploads.length ? (
              <ul className="divide-y divide-line text-sm">
                {uploads.map((u) => (
                  <li key={u.id} className="flex justify-between gap-3 py-2"><span className="truncate">{u.name}</span><span className="num shrink-0 text-xs text-muted">{fileSize(u.size)}, {dateTime(u.uploadedAt)}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Nothing uploaded yet.</p>}
          </Card>
        </section>
      </div>
    </>
  );
}
