"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { RealtimeSync } from "@/components/realtime-sync";
import { StaggeredMenu, type StaggeredMenuItem } from "@/components/ui/staggered-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { TelegramNotificationsPanel } from "@/components/notifications/telegram-notifications-panel";

const navItems: StaggeredMenuItem[] = [
  { label: "ראשי", link: "/dashboard", ariaLabel: "מסך הבית" },
  { label: "משימות פעילות", link: "/tasks/active", ariaLabel: "משימות פעילות" },
  { label: "משימות קרובות", link: "/tasks/upcoming", ariaLabel: "משימות קרובות" },
  { label: "משתמשים", link: "/admin/users", ariaLabel: "ניהול משתמשים" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const [session, setSession] = useState<SessionSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadSession = async () => {
      const response = await fetch("/api/auth/session");
      if (!response.ok) return;
      const data = (await response.json()) as SessionSnapshot | null;
      if (cancelled || !data?.user) return;
      setSession(data);
    };
    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = session?.user?.role === "admin" || Boolean(session?.user?.isAdmin);
  const routeLabel: Record<string, string> = {
    dashboard: "ראשי",
    tasks: "משימות",
    active: "פעילות",
    upcoming: "קרובות",
    projects: "פרויקטים",
    domains: "תחומים",
    subtopics: "תתי-נושאים",
    users: "משתמשים",
    admin: "ניהול",
  };

  return (
    <div className="relative min-h-screen bg-background text-text-primary transition-colors">
      <RealtimeSync />
      <StaggeredMenu
        isFixed
        position="right"
        items={navItems}
        displayItemNumbering={false}
        accentColor="#5b8cff"
        colors={["#dbeafe", "#a5b4fc", "#c4b5fd"]}
        menuButtonColor="#0f172a"
        openMenuButtonColor="#0f172a"
        footer={<MenuFooter />}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-4 pb-6 pt-5 sm:px-6 lg:px-8">
        <header className="mb-4 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="w-32 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-start gap-2 text-sm">
                <Link href="/dashboard" className="rounded-lg bg-surface-2/80 px-2 py-1 text-text-secondary hover:text-text-primary">
                  דף הבית
                </Link>
                {segments.map((segment, index) => {
                  const href = `/${segments.slice(0, index + 1).join("/")}`;
                  return (
                    <span key={href} className="inline-flex items-center gap-2">
                      <span className="text-text-muted">/</span>
                      <Link
                        href={href}
                        className="rounded-lg bg-surface-2/80 px-2 py-1 text-text-secondary hover:text-text-primary"
                      >
                        {routeLabel[segment] ?? segment}
                      </Link>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <TelegramNotificationsPanel isAdmin={isAdmin} />
            </div>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

type SessionSnapshot = {
  user?: {
    name?: string | null;
    email?: string | null;
    isApproved?: boolean;
    isAdmin?: boolean;
    role?: string;
  };
};

function MenuFooter() {
  const [session, setSession] = useState<SessionSnapshot | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const response = await fetch("/api/auth/session");
      if (!response.ok) return;
      const data = (await response.json()) as SessionSnapshot | null;
      if (!data?.user) return;
      setSession(data);
    };
    loadSession();
  }, []);

  if (!session?.user) return null;

  const label = session.user.name || session.user.email || "משתמש מחובר";

  return (
    <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/80 p-3 dark:border-emerald-400/30 dark:bg-emerald-500/10">
      <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">התחברות</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="truncate text-sm font-semibold text-text-primary">{label}</span>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border-weak bg-white px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:bg-surface-2 dark:hover:border-rose-400/50 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
      >
        <LogOut size={13} />
        התנתק
      </button>
    </div>
  );
}
