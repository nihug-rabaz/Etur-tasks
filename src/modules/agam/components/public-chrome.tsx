import type { ReactNode } from "react";

export function AgamPublicChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary" dir="rtl">
      <header className="flex items-center gap-3 px-4 py-4 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mador-omtz.png" alt="מדור אומ״ץ" className="h-12 w-auto object-contain" />
        <div>
          <p className="text-xs font-bold text-accent-primary">הרבנות הצבאית</p>
          <p className="text-sm font-extrabold">איתור קציני דת</p>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">{children}</main>
    </div>
  );
}
