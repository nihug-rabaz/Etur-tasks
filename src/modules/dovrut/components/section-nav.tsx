"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  rowsForNavPreview,
  useDovrutNavPreview,
  type DovrutNavPreviewKey,
} from "@/modules/dovrut/lib/nav-preview";

const ITEMS = [
  { href: "/dovrut/campaigns", label: "קמפיינים", shortLabel: "קמפיינים", key: "campaigns" },
  { href: "/dovrut/projects", label: "פרויקטים", shortLabel: "פרויקטים", key: "projects" },
  { href: "/dovrut/items", label: "אייטמים", shortLabel: "אייטמים", key: "items" },
  { href: "/dovrut/inquiry-subjects", label: "גורמי תחקורים", shortLabel: "תחקורים", key: "inquiry" },
  { href: "/dovrut/tasks", label: "משימות", shortLabel: "משימות", key: "tasks" },
  { href: "/dovrut/approvals", label: "אישורי אייטמים", shortLabel: "אישורים", key: "approvals" },
] as const satisfies ReadonlyArray<{ href: string; label: string; shortLabel: string; key: DovrutNavPreviewKey }>;

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  if (href === "/dovrut/projects" && pathname.startsWith("/dovrut/projects/archive")) return false;
  return true;
}

function canHoverDevice(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function DovrutSectionNav() {
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState<DovrutNavPreviewKey | null>(null);
  const { preview, loadPreview } = useDovrutNavPreview();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = (key: DovrutNavPreviewKey) => {
    if (!canHoverDevice()) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(key);
    void loadPreview();
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 160);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="sticky top-0 z-20 border-b border-black/8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:border-white/10">
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="px-3 py-2 sm:overflow-x-auto sm:overscroll-x-contain sm:px-6 sm:py-2.5 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
        <div className="grid grid-cols-3 gap-1 sm:flex sm:w-max sm:min-w-full sm:flex-nowrap sm:gap-2">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const open = openKey === item.key;
            const rows = rowsForNavPreview(preview, item.key);
            return (
              <div
                key={item.href}
                className="relative sm:shrink-0"
                onMouseEnter={() => openMenu(item.key)}
                onMouseLeave={scheduleClose}
                onFocus={() => openMenu(item.key)}
              >
                <Link
                  href={item.href}
                  onClick={() => setOpenKey(null)}
                  className={`flex w-full items-center justify-center whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold transition sm:inline-flex sm:w-auto sm:px-4 sm:py-2 sm:text-sm ${
                    active
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-text-primary hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
                {open ? (
                  <div className="absolute end-0 top-[calc(100%+0.4rem)] z-30 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-black/8 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#161922]">
                    {rows.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-text-muted">אין רשומות פעילות</p>
                    ) : (
                      rows.map((row) => (
                        <Link
                          key={row.id}
                          href={row.href}
                          onClick={() => setOpenKey(null)}
                          className="block rounded-xl px-3 py-2 text-sm font-semibold text-text-primary hover:bg-violet-50 dark:hover:bg-violet-950/40"
                        >
                          {row.name}
                        </Link>
                      ))
                    )}
                    <Link
                      href={item.href}
                      onClick={() => setOpenKey(null)}
                      className="mt-1 block rounded-xl px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/40"
                    >
                      לכל {item.label} →
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
