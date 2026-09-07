import type { ReactNode } from "react";

export function AgamPublicChrome({ children }: { children: ReactNode }) {
  return (
    <div className="agam-scope flex min-h-screen flex-col bg-background text-text-primary" dir="rtl">
      <header className="flex items-center gap-3 px-2 py-4 sm:px-3 lg:px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mador-omtz.png" alt="מדור אומ״ץ" className="h-10 w-auto object-contain sm:h-11" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            הרבנות הצבאית
          </p>
          <p className="text-sm font-extrabold text-text-primary">קצינים</p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-start justify-center px-2 pb-10 pt-1 sm:px-3 lg:px-4">
        {children}
      </main>
    </div>
  );
}
