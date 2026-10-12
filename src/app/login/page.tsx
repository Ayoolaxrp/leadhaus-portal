import type { Metadata } from "next";
import { signIn, resetDemo } from "@/lib/actions";
import { db } from "@/lib/data/store";
import { btn, field } from "@/components/ui";
import { isSupabaseAuthEnabled } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://leadhausstudios.com";

const errors: Record<string, string> = {
  code: "That access code is not right. Check the code you were given and try again.",
  user: "Please pick one of the accounts below.",
  unassigned: "Your account is awaiting assignment. Contact the Leadhaus team.",
  auth: "The sign-in link is invalid or expired. Request a fresh link.",
  config: "Authentication is not configured. Contact the site administrator.",
};

export default async function Login({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const useSupabase = isSupabaseAuthEnabled();
  const needsCode = process.env.NODE_ENV === "production" || Boolean(process.env.DEMO_PASSCODE);
  const clients = db.users.filter((u) => u.role === "client");
  const team = db.users.filter((u) => u.role === "admin");
  const company = (id?: string) => db.clients.find((c) => c.id === id)?.name;
  const error = errors[String(sp.error ?? "")];

  const Option = ({ id, name, sub }: { id: string; name: string; sub?: string }) => (
    <button name="userId" value={id} className="flex w-full items-center justify-between gap-4 rounded-[var(--radius-ctl)] border border-line bg-surface px-4 py-3 text-left transition hover:border-accent/60 active:scale-[0.99]">
      <span>
        <span className="block text-sm font-medium">{name}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
      <span className="text-xs text-accent">Sign in</span>
    </button>
  );

  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center justify-between">
          <a href={SITE_URL} className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.08em]">
            <span aria-hidden className="flex flex-col items-center text-[11px] font-bold leading-none"><span>L</span><span className="my-0.5 h-0.5 w-2.5 bg-accent" /><span>H</span></span>
            LEADHAUS
          </a>
          <a href={SITE_URL} className="text-xs text-muted hover:text-text">Back to website</a>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{useSupabase ? "Sign in with your invited Leadhaus account. Client access is limited to your business." : "This local demo uses sample data. Choose an account to explore the client and team workflows."}</p>

        {error && <p role="alert" className="mt-5 rounded-[var(--radius-ctl)] border border-bad/40 bg-bad/10 px-3 py-2.5 text-sm text-bad">{error}</p>}
        {useSupabase && <LoginForm />}
        {sp.reset && <p role="status" className="mt-5 rounded-[var(--radius-ctl)] border border-good/40 bg-good/10 px-3 py-2.5 text-sm text-good">Demo data has been reset to the starting point.</p>}

        {!useSupabase && <form action={signIn} className="mt-8 space-y-6">
          {needsCode && (
            <div>
              <label htmlFor="passcode" className="mb-1.5 block text-xs font-medium text-muted">Access code</label>
              <input id="passcode" name="passcode" type="password" autoComplete="off" className={field} required />
            </div>
          )}
          <section>
            <h2 className="mb-2 text-xs font-medium text-muted">Client accounts</h2>
            <div className="space-y-2">{clients.map((u) => <Option key={u.id} id={u.id} name={u.name} sub={company(u.clientId)} />)}</div>
          </section>
          <section>
            <h2 className="mb-2 text-xs font-medium text-muted">Leadhaus team accounts</h2>
            <div className="space-y-2">{team.map((u) => <Option key={u.id} id={u.id} name={u.name} sub={u.title} />)}</div>
          </section>
        </form>}

        {!useSupabase && <form action={resetDemo} className="mt-10 border-t border-line pt-6">
          <p className="text-sm font-medium">Start testing again from scratch</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">Puts every approval, message, payment and lead back to how it started. Everyone testing shares the same data, so let others know before you press it.</p>
          {needsCode && (
            <>
              <label htmlFor="reset-code" className="mt-3 mb-1.5 block text-xs text-muted">Access code</label>
              <input id="reset-code" name="passcode" type="password" autoComplete="off" className={field} required />
            </>
          )}
          <button className={`${btn.secondary} mt-3`}>Reset demo</button>
        </form>}
      </div>
    </main>
  );
}
