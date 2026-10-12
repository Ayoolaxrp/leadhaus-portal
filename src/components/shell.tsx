"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  SquaresFour, Kanban, ImageSquare, Compass, ChartBar, ListChecks, FileText, ChatCircleText, Receipt,
  Funnel, Buildings, CheckSquare, Wallet, UsersThree, ChatsCircle, GearSix, SignOut, ShieldCheck,
} from "@phosphor-icons/react";

const icons = { SquaresFour, Kanban, ImageSquare, Compass, ChartBar, ListChecks, FileText, ChatCircleText, Receipt, Funnel, Buildings, CheckSquare, Wallet, UsersThree, ChatsCircle, GearSix };
export type NavItem = { href: string; label: string; icon: keyof typeof icons; badge?: number };

export function Shell({ nav, workspace, workspaceLabel, user, signOut, demo = true, children }: { demo?: boolean; nav: NavItem[]; workspace: string; workspaceLabel: string; user: { name: string; title?: string }; signOut: () => Promise<void>; children: ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/portal" || href === "/admin" ? path === href : path.startsWith(href));

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[248px_1fr]">
      <aside data-app-chrome className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur lg:h-[100dvh] lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-6">
          <Link href={nav[0].href} className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.08em]">
            <span className="h-1 w-6 rounded-full bg-accent" aria-hidden />
            LEADHAUS
          </Link>
          <div className="hidden lg:mt-7 lg:block lg:rounded-[var(--radius-ctl)] lg:border lg:border-line lg:bg-surface lg:p-3">
            <p className="text-[11px] text-muted">{workspaceLabel}</p>
            <p className="truncate text-sm font-medium">{workspace}</p>
          </div>
          <form action={signOut} className="lg:hidden">
            <button className="grid size-9 place-items-center rounded-[var(--radius-ctl)] border border-line" aria-label="Sign out" title="Sign out"><SignOut size={16} /></button>
          </form>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] lg:mt-2 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
          {nav.map((n) => {
            const Icon = icons[n.icon];
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-[var(--radius-ctl)] px-3 py-2 text-sm whitespace-nowrap transition ${active ? "bg-surface-2 text-text" : "text-muted hover:bg-surface hover:text-text"}`}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} className={active ? "text-accent" : ""} aria-hidden />
                <span>{n.label}</span>
                {!!n.badge && <span className="num ml-auto rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-ink">{n.badge}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 hidden border-t border-line p-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.title}</p>
            </div>
            <form action={signOut}>
              <button className="grid size-8 place-items-center rounded-[var(--radius-ctl)] text-muted hover:bg-surface hover:text-text" aria-label="Sign out" title="Sign out"><SignOut size={16} /></button>
            </form>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted"><ShieldCheck size={13} aria-hidden /> Private to {workspace}</p>
        </div>
      </aside>
      <main className="enter mx-auto w-full max-w-[1240px] px-4 py-8 md:px-8 lg:px-12 lg:py-12">
        {demo && (
          <p data-demo-banner className="mb-6 rounded-[var(--radius-ctl)] border border-line bg-surface px-4 py-2.5 text-xs text-muted">
            Demo workspace with sample data. Anything you change is saved until someone presses Reset demo on the sign in page.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
