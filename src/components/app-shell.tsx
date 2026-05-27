"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { RealtimeSync } from "@/components/realtime-sync";
import { SideMenu, SideMenuTrigger, useSideMenu, type SideMenuItem } from "@/components/side-menu";
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
  const sideMenu = useSideMenu();

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
    <div className="relative flex min-h-screen flex-col bg-background text-text-primary transition-colors">
      <RealtimeSync />
      <SideMenu items={navItems} userLabel={userLabel} state={sideMenu} />
      <header
        className="topbar w-full px-3 py-3 shadow-sm sm:px-6 lg:px-8"
        style={{ backgroundColor: "#0a3a5e" }}
      >
        <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-2 sm:gap-3">
          <SideMenuTrigger state={sideMenu} className="shrink-0" />
          <nav
            aria-label="פירורי לחם"
            className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <ol className="flex w-max items-center gap-1.5 whitespace-nowrap text-xs sm:gap-2 sm:text-sm">
              <li>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-lg bg-white/15 px-2 py-1 font-medium text-white transition hover:bg-white/25"
                >
                  דף הבית
                </Link>
              </li>
              {segments.map((segment, index) => {
                const href = `/${segments.slice(0, index + 1).join("/")}`;
                return (
                  <li key={href} className="inline-flex items-center gap-1.5 sm:gap-2">
                    <span className="text-white/40">/</span>
                    <Link
                      href={href}
                      className="inline-flex items-center rounded-lg bg-white/15 px-2 py-1 font-medium text-white transition hover:bg-white/25"
                    >
                      {routeLabel[segment] ?? segment}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <TelegramNotificationsPanel isAdmin={isAdmin} />
          </div>
        </div>
      </header>
      <div className="relative mx-auto flex w-full max-w-screen-2xl flex-1 flex-col px-4 pb-6 pt-5 sm:px-6 lg:px-8">
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
