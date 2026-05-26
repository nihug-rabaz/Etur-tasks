"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { RealtimeSync } from "@/components/realtime-sync";
import { SideMenu, type SideMenuItem } from "@/components/side-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { TelegramNotificationsPanel } from "@/components/notifications/telegram-notifications-panel";

const navItems: SideMenuItem[] = [
  { label: "ראשי", href: "/dashboard", description: "סקירה כללית של הכל" },
  { label: "משימות פעילות", href: "/tasks/active", description: "מה עובד עכשיו" },
  { label: "משימות קרובות", href: "/tasks/upcoming", description: "מה בדרך אלינו" },
  { label: "משתמשים", href: "/admin/users", description: "ניהול חברי הצוות" },
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

  const userLabel = session?.user?.name || session?.user?.email || null;

  return (
    <div className="relative min-h-screen bg-background text-text-primary transition-colors">
      <RealtimeSync />
      <SideMenu items={navItems} userLabel={userLabel} />
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
