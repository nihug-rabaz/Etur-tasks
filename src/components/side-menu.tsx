"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

// Build up to two uppercase initials from a name or email for the avatar badge.
function getInitials(label: string): string {
  const source = label.includes("@") ? label.split("@")[0] : label;
  const words = source.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

export interface SideMenuItem {
  label: string;
  href: string;
  description?: string;
  ariaLabel?: string;
  icon?: ReactNode;
}

export interface SideMenuState {
  open: boolean;
  toggle: () => void;
  close: () => void;
  setOpen: (next: boolean) => void;
}

export function useSideMenu(): SideMenuState {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  return { open, toggle, close, setOpen };
}

interface SideMenuTriggerProps {
  state: SideMenuState;
  className?: string;
}

export function SideMenuTrigger({ state, className }: SideMenuTriggerProps) {
  const baseClass =
    "inline-flex items-center gap-2 rounded-full bg-accent-primary px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(139,92,246,0.5)] transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 sm:px-4 sm:text-sm";
  return (
    <button
      type="button"
      onClick={state.toggle}
      aria-expanded={state.open}
      aria-controls="app-side-menu"
      aria-label={state.open ? "סגירת תפריט" : "פתיחת תפריט"}
      className={className ? `${baseClass} ${className}` : baseClass}
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <Menu
          size={16}
          className={`absolute transition-all duration-300 ${
            state.open ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          }`}
        />
        <X
          size={16}
          className={`absolute transition-all duration-300 ${
            state.open ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
          }`}
        />
      </span>
      <span className="hidden tracking-wide sm:inline">{state.open ? "סגירה" : "תפריט"}</span>
    </button>
  );
}

interface SideMenuProps {
  items: SideMenuItem[];
  userLabel?: string | null;
  showLogout?: boolean;
  state: SideMenuState;
}

export function SideMenu({ items, userLabel, showLogout = true, state }: SideMenuProps) {
  const pathname = usePathname();
  const { open, close } = state;

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
        className={`side-panel fixed inset-y-0 right-0 z-[65] flex w-[min(420px,88vw)] flex-col overflow-hidden text-text-primary shadow-[-30px_0_60px_-20px_rgba(22,24,29,0.25)] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-purple/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent-cyan/12 blur-3xl" />
        </div>

        <div className="relative flex h-full flex-col gap-6 px-7 pb-7 pt-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-primary">ניווט מהיר</p>
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
                      className={`group flex items-center justify-between gap-4 rounded-2xl px-4 py-3 transition ${
                        active
                          ? "bg-accent-primary text-white shadow-[0_12px_28px_-12px_rgba(139,92,246,0.6)]"
                          : "bg-surface-2 text-text-secondary hover:-translate-y-0.5 hover:bg-accent-primary/10 hover:text-accent-primary"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold tabular-nums ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-surface-1 text-text-muted group-hover:text-accent-primary"
                          }`}
                        >
                          {item.icon ?? String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex flex-col">
                          <span className="text-base font-bold leading-tight">{item.label}</span>
                          {item.description ? (
                            <span className={`text-xs ${active ? "text-white/70" : "text-text-muted"}`}>{item.description}</span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={`text-lg transition-transform ${
                          active ? "translate-x-0 text-white" : "-translate-x-1 text-text-muted group-hover:translate-x-0 group-hover:text-accent-primary"
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
            <div className="flex items-center gap-3 rounded-full bg-surface-2 py-2 pe-2 ps-3">
              {userLabel ? (
                <>
                  <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-primary text-sm font-bold text-white">
                    {getInitials(userLabel)}
                    <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-surface-1 bg-emerald-500" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{userLabel}</span>
                </>
              ) : (
                <span className="flex-1" />
              )}
              {showLogout ? (
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  aria-label="התנתקות"
                  title="התנתקות"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition hover:bg-danger/15 hover:text-danger"
                >
                  <LogOut size={16} />
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
