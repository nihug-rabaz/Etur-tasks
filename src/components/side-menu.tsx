"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

export interface SideMenuItem {
  label: string;
  href: string;
  description?: string;
  ariaLabel?: string;
  icon?: ReactNode;
}

interface SideMenuProps {
  items: SideMenuItem[];
  userLabel?: string | null;
  showLogout?: boolean;
}

export function SideMenu({ items, userLabel, showLogout = true }: SideMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="app-side-menu"
        className="fixed right-4 top-4 z-[70] inline-flex items-center gap-2 rounded-full border border-border-weak bg-surface-1/85 px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_8px_22px_rgba(15,23,42,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:border-accent-primary/60 hover:shadow-[0_12px_28px_rgba(91,140,255,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
      >
        <span className="relative inline-flex h-4 w-4 items-center justify-center">
          <Menu
            size={16}
            className={`absolute transition-all duration-300 ${
              open ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
            }`}
          />
          <X
            size={16}
            className={`absolute transition-all duration-300 ${
              open ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
            }`}
          />
        </span>
        <span className="tracking-wide">{open ? "סגירה" : "תפריט"}</span>
      </button>

      <div
        role="presentation"
        onClick={close}
        className={`fixed inset-0 z-[60] bg-[#020617]/55 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="app-side-menu"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[65] flex w-[min(420px,88vw)] flex-col overflow-hidden border-l border-border-weak bg-surface-1/95 shadow-[-30px_0_60px_-20px_rgba(2,6,23,0.55)] backdrop-blur-xl transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-primary/25 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent-secondary/20 blur-3xl" />
        </div>

        <div className="relative flex h-full flex-col gap-6 px-7 pb-7 pt-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-text-muted">ניווט מהיר</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-text-primary">לאן בא לנו לקפוץ?</h2>
          </div>

          <nav className="flex-1 overflow-y-auto pr-1">
            <ul className="flex flex-col gap-2">
              {items.map((item, index) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-label={item.ariaLabel ?? item.label}
                      className={`group flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition ${
                        active
                          ? "border-accent-primary/60 bg-accent-primary/12 text-text-primary shadow-[0_10px_25px_-12px_rgba(91,140,255,0.55)]"
                          : "border-border-weak/70 bg-surface-2/55 text-text-secondary hover:-translate-y-0.5 hover:border-accent-primary/40 hover:bg-surface-2 hover:text-text-primary"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold tabular-nums ${
                            active
                              ? "bg-accent-primary text-white"
                              : "bg-surface-1 text-text-muted group-hover:text-accent-primary"
                          }`}
                        >
                          {item.icon ?? String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex flex-col">
                          <span className="text-base font-bold leading-tight">{item.label}</span>
                          {item.description ? (
                            <span className="text-xs text-text-muted">{item.description}</span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={`text-lg transition-transform ${
                          active ? "translate-x-0 text-accent-primary" : "-translate-x-1 text-text-muted group-hover:translate-x-0 group-hover:text-accent-primary"
                        }`}
                        aria-hidden
                      >
                        ←
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {userLabel || showLogout ? (
            <div className="rounded-2xl border border-border-weak/70 bg-surface-2/70 p-4">
              {userLabel ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.65)]" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted">מחובר</p>
                    <p className="truncate text-sm font-bold text-text-primary">{userLabel}</p>
                  </div>
                </div>
              ) : null}
              {showLogout ? (
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-weak bg-surface-1 px-3 py-2 text-xs font-semibold text-text-secondary transition hover:border-rose-400/60 hover:bg-rose-500/10 hover:text-rose-500"
                >
                  <LogOut size={14} />
                  התנתקות
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

export default SideMenu;
