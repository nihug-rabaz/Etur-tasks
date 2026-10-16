"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import { primaryButtonClass } from "@/modules/malshabim/lib/ui";

const DISMISS_KEY = "malshabim-waitlist-reminder-dismissed";

export function MalshabimWaitlistReminder() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!pathname?.startsWith("/malshabim")) return;
    if (pathname.startsWith("/malshabim/waitlist")) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await malshabimFetch<{ count?: number; entries?: unknown[] }>(
          "/api/malshabim/waitlist",
        );
        const n = res.count ?? res.entries?.length ?? 0;
        if (!cancelled && n > 0) {
          setCount(n);
          setOpen(true);
        }
      } catch {
        // No reminder if unauthorized / table missing
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!open || count <= 0) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="malshabim-waitlist-reminder-title"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-surface-1 p-5 shadow-2xl sm:p-6" dir="rtl">
        <button
          type="button"
          className="absolute start-3 top-3 rounded-full p-2 text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
          aria-label="סגור תזכורת"
          onClick={dismiss}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <Bell className="h-7 w-7" />
          </div>
          <h2
            id="malshabim-waitlist-reminder-title"
            className="text-lg font-black text-text-primary sm:text-xl"
          >
            יש חיילים שחייבים ראיון
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            כדי לוודא שלא מפספסים אף אחד — כנסו לרשימה והתחילו ראיונות.
            <br />
            סה״כ חייבים ראיון: <strong className="text-text-primary">{count}</strong>
          </p>
          <Link
            href="/malshabim/waitlist"
            className={`${primaryButtonClass} mt-1 w-full justify-center`}
            onClick={dismiss}
          >
            הצג רשימה
          </Link>
        </div>
      </div>
    </div>
  );
}
