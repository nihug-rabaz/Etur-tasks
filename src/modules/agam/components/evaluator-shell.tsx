"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { DevelopedByCredit } from "@/components/developed-by-credit";

function initialsOf(label: string | null): string {
  if (!label) return "?";
  const parts = label.replace(/@.*/, "").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}

/** Focused chrome for evaluators (ממיינים): no module navigation, just the active cycle workspace. */
export function EvaluatorShell({
  children,
  userLabel,
  banner,
}: {
  children: ReactNode;
  userLabel: string | null;
  banner?: ReactNode;
}) {
  return (
    <div className="agam-scope relative flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-[color-mix(in_srgb,var(--background)_90%,#e6ebf4)] text-text-primary dark:bg-background">
      {banner}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 bg-[radial-gradient(60%_100%_at_85%_0%,rgba(16,185,129,0.12),transparent_70%),radial-gradient(50%_90%_at_10%_0%,rgba(14,165,233,0.10),transparent_70%)]"
      />
      <header className="sticky top-0 z-30 border-b border-border-weak/40 bg-surface-1/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-3 sm:px-5">
          <Link href="/agam/evaluate" className="flex min-w-0 flex-1 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mador-omtz.png"
              alt=""
              className="h-9 w-9 shrink-0 rounded-xl bg-surface-1 object-contain p-1 shadow-sm ring-1 ring-black/[0.06] dark:ring-white/10"
            />
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
                קורס קציני דת
              </span>
              <span className="block truncate text-sm font-extrabold text-text-primary">פורטל מעריכים</span>
            </span>
          </Link>
          {userLabel ? (
            <span className="hidden items-center gap-2 rounded-full bg-surface-2/80 py-1 pe-3 ps-1 sm:inline-flex">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white">
                {initialsOf(userLabel)}
              </span>
              <span className="max-w-[10rem] truncate text-[12px] font-bold text-text-secondary">{userLabel}</span>
            </span>
          ) : null}
          <ThemeToggle />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/agam/evaluator" })}
            aria-label="התנתקות"
            title="התנתקות"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-muted transition hover:bg-danger/15 hover:text-danger"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-12 pt-4 sm:px-5 sm:pt-6">
        {children}
      </main>
      <footer className="shrink-0 px-4 py-3">
        <DevelopedByCredit compact />
      </footer>
    </div>
  );
}
