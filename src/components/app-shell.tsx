"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ImpersonationBanner, type ImpersonationViewState } from "@/components/admin/impersonation-banner";
import { RealtimeSync } from "@/components/realtime-sync";
import { SideMenu, SideMenuTrigger, useSideMenu, type SideMenuItem } from "@/components/side-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { TelegramNotificationsPanel } from "@/components/notifications/telegram-notifications-panel";
import { AdminMessageComposer } from "@/components/notifications/admin-message-composer";
import { DailyPlannerLauncher } from "@/components/daily-planner/daily-planner-launcher";
import { CloseRequestsProvider } from "@/components/tasks/close-requests-context";
import { AdminCloseRequestsInbox } from "@/components/tasks/admin-close-requests-inbox";

const navItems: SideMenuItem[] = [
  { label: "ראשי", href: "/dashboard", description: "סקירה כללית של הכל" },
  { label: "משימות פעילות", href: "/tasks/active", description: "מה עובד עכשיו" },
  { label: "לוח זמנים", href: "/tasks/upcoming", description: "משימות, פגישות ולו״זים" },
  { label: "ארכיון", href: "/tasks/archive", description: "משימות שהושלמו" },
  { label: "משתמשים", href: "/admin/users", description: "ניהול חברי הצוות" },
];

const adminNavItems: SideMenuItem[] = [
  { label: "הגדרות מערכת", href: "/admin/settings", description: "איקונים ותצוגת טאבים" },
];

function getBreadcrumbHref(segments: string[], index: number): string | null {
  const href = `/${segments.slice(0, index + 1).join("/")}`;
  const exactRoutes = new Set([
    "/dashboard",
    "/tasks/active",
    "/tasks/upcoming",
    "/tasks/archive",
    "/admin/users",
    "/admin/settings",
    "/settings/profile",
  ]);
  if (exactRoutes.has(href)) return href;

  const [section] = segments;
  const isDynamicDetails =
    index === 1 && (section === "projects" || section === "domains" || section === "subtopics");
  return isDynamicDetails ? href : null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationViewState>({
    active: false,
    actor: null,
    target: null,
  });
  const sideMenu = useSideMenu();

  const loadProfile = useCallback(async () => {
    const response = await fetch("/api/profile");
    if (!response.ok) return;
    const data = (await response.json()) as ProfileSnapshot;
    setProfile(data);
    if (data.impersonation) {
      setImpersonation(data.impersonation);
    } else {
      setImpersonation({ active: false, actor: null, target: null });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSession = async () => {
      const response = await fetch("/api/auth/session");
      if (!response.ok) return;
      const data = (await response.json()) as SessionSnapshot | null;
      if (cancelled || !data?.user) return;
      setSession(data);
    };
    void loadSession();
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [loadProfile, pathname]);

  const isRealAdmin = session?.user?.role === "admin" || Boolean(session?.user?.isAdmin);
  const isImpersonating = impersonation.active;
  const menuItems = useMemo(
    () => (isRealAdmin && !isImpersonating ? [...navItems, ...adminNavItems] : navItems),
    [isRealAdmin, isImpersonating],
  );
  const routeLabel: Record<string, string> = {
    dashboard: "ראשי",
    tasks: "משימות",
    active: "פעילות",
    upcoming: "לוח זמנים",
    archive: "ארכיון",
    projects: "פרויקטים",
    domains: "תחומים",
    subtopics: "תתי-נושאים",
    users: "משתמשים",
    admin: "ניהול",
    settings: "הגדרות",
    profile: "הגדרות אישיות",
  };
  const userLabel = profile?.name || session?.user?.name || session?.user?.email || null;
  const userAvatarUrl = profile?.avatar ?? null;
  const isDashboard = pathname === "/dashboard";

  return (
    <CloseRequestsProvider>
      <div className="relative flex min-h-screen flex-col bg-background text-text-primary transition-colors">
        <RealtimeSync />
        <ImpersonationBanner state={impersonation} onStopped={loadProfile} />
        <SideMenu items={menuItems} userLabel={userLabel} userAvatarUrl={userAvatarUrl} state={sideMenu} />
        <header className="topbar w-full px-3 py-3 sm:px-6 lg:px-8">
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
                    className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1.5 font-semibold text-text-secondary transition hover:bg-accent-primary/12 hover:text-accent-primary"
                  >
                    דף הבית
                  </Link>
                </li>
                {segments.map((segment, index) => {
                  if (segment === "dashboard") return null;
                  const href = getBreadcrumbHref(segments, index);
                  const label = routeLabel[segment] ?? segment;
                  return (
                    <li key={`${segment}-${index}`} className="inline-flex items-center gap-1.5 sm:gap-2">
                      <span className="text-text-muted/50">/</span>
                      {href ? (
                        <Link
                          href={href}
                          className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1.5 font-semibold text-text-secondary transition hover:bg-accent-primary/12 hover:text-accent-primary"
                        >
                          {label}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-surface-2/60 px-3 py-1.5 font-semibold text-text-muted">
                          {label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <AdminCloseRequestsInbox />
              <ThemeToggle />
              {isRealAdmin && !isImpersonating ? <AdminMessageComposer iconOnly /> : null}
              <TelegramNotificationsPanel isAdmin={isRealAdmin && !isImpersonating} />
            </div>
            <div className="shrink-0 ps-1 sm:ps-2">
              <DailyPlannerLauncher />
            </div>
          </div>
        </header>
        <div
          className={`relative mx-auto flex w-full flex-1 flex-col ${
            isDashboard ? "max-w-none px-0 pb-0 pt-0" : "max-w-screen-2xl px-4 pb-6 pt-5 sm:px-6 lg:px-8"
          }`}
        >
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </div>
      </div>
    </CloseRequestsProvider>
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

type ProfileSnapshot = {
  name: string;
  avatar: string | null;
  impersonation?: ImpersonationViewState;
};
