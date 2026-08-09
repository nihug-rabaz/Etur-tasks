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
import {
  getNavForPathname,
  listAccessibleModules,
  resolveActiveModuleId,
  type ModuleAccessContext,
  type ModuleRole,
} from "@/shared/modules/registry";

function getBreadcrumbHref(segments: string[], index: number): string | null {
  const href = `/${segments.slice(0, index + 1).join("/")}`;
  const exactRoutes = new Set([
    "/",
    "/dashboard",
    "/tasks/active",
    "/tasks/upcoming",
    "/tasks/archive",
    "/admin/users",
    "/admin/settings",
    "/settings/profile",
    "/dovrut",
    "/dovrut/projects",
    "/dovrut/concepts",
    "/dovrut/news",
    "/dovrut/approvals",
    "/dovrut/approval/branch-head",
    "/dovrut/approval/deputy-commander",
    "/dovrut/approval/chief-rabbi",
    "/dovrut/admin/users",
    "/dovrut/admin/approvers",
  ]);
  if (exactRoutes.has(href)) return href;

  const [section] = segments;
  if (section === "dovrut" && index === 1 && (segments[1] === "projects" || segments[1] === "concepts")) {
    return href;
  }
  const isDynamicDetails =
    index === 1 && (section === "projects" || section === "domains" || section === "subtopics");
  return isDynamicDetails ? href : null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [moduleRoles, setModuleRoles] = useState<Record<string, ModuleRole>>({});
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

  const loadModuleRoles = useCallback(async () => {
    const response = await fetch("/api/modules/roles");
    if (!response.ok) return;
    const data = (await response.json()) as { roles?: Record<string, ModuleRole> };
    setModuleRoles(data.roles ?? {});
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
    void loadModuleRoles();
    return () => {
      cancelled = true;
    };
  }, [loadProfile, loadModuleRoles, pathname]);

  const isRealAdmin = session?.user?.role === "admin" || Boolean(session?.user?.isAdmin);
  const isImpersonating = impersonation.active;
  const access: ModuleAccessContext = useMemo(
    () => ({
      isPlatformAdmin: isRealAdmin,
      moduleRoles,
    }),
    [isRealAdmin, moduleRoles],
  );

  const { module: activeModule, items: moduleNavItems } = useMemo(
    () => getNavForPathname(pathname, access, { isImpersonating }),
    [pathname, access, isImpersonating],
  );

  const accessibleModules = useMemo(() => listAccessibleModules(access), [access]);
  const activeModuleId = resolveActiveModuleId(pathname);

  const menuItems: SideMenuItem[] = useMemo(
    () =>
      moduleNavItems.map((item) => ({
        label: item.label,
        href: item.href,
        description: item.description,
      })),
    [moduleNavItems],
  );

  const routeLabel = useMemo(() => {
    const labels: Record<string, string> = {
      ...(activeModule?.breadcrumbLabels ?? {}),
    };
    return labels;
  }, [activeModule]);

  const userLabel = profile?.name || session?.user?.name || session?.user?.email || null;
  const userAvatarUrl = profile?.avatar ?? null;
  const isDashboard = pathname === "/dashboard" || pathname === "/dovrut";
  const isHome = pathname === "/";
  const showTasksChrome = activeModuleId === "tasks";

  return (
    <CloseRequestsProvider>
      <div className="relative flex min-h-screen flex-col bg-background text-text-primary transition-colors">
        <RealtimeSync />
        <ImpersonationBanner state={impersonation} onStopped={loadProfile} />
        <SideMenu items={menuItems} userLabel={userLabel} userAvatarUrl={userAvatarUrl} state={sideMenu} />
        <header className="topbar w-full px-3 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-2 sm:gap-3">
            <SideMenuTrigger state={sideMenu} className="shrink-0" />
            {accessibleModules.length > 1 ? (
              <div className="hidden items-center gap-1 rounded-full bg-surface-2 p-1 sm:flex">
                {accessibleModules.map((module) => {
                  const active = activeModuleId === module.id;
                  const href =
                    module.id === "dovrut" && moduleRoles.dovrut === "approver" && !isRealAdmin
                      ? "/dovrut/approvals"
                      : module.href;
                  return (
                    <Link
                      key={module.id}
                      href={href}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        active
                          ? "bg-accent-primary text-white"
                          : "text-text-secondary hover:bg-accent-primary/12 hover:text-accent-primary"
                      }`}
                    >
                      {module.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
            <nav
              aria-label="פירורי לחם"
              className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <ol className="flex w-max items-center gap-1.5 whitespace-nowrap text-xs sm:gap-2 sm:text-sm">
                <li>
                  <Link
                    href="/"
                    className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1.5 font-semibold text-text-secondary transition hover:bg-accent-primary/12 hover:text-accent-primary"
                  >
                    פלטפורמה
                  </Link>
                </li>
                {segments.map((segment, index) => {
                  if (segment === "dashboard" && index === 0) return null;
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
              {showTasksChrome ? <AdminCloseRequestsInbox /> : null}
              <ThemeToggle />
              {showTasksChrome && isRealAdmin && !isImpersonating ? (
                <AdminMessageComposer iconOnly />
              ) : null}
              {showTasksChrome ? (
                <TelegramNotificationsPanel isAdmin={isRealAdmin && !isImpersonating} />
              ) : null}
            </div>
            {showTasksChrome && !isDashboard ? (
              <div className="shrink-0 ps-1 sm:ps-2">
                <DailyPlannerLauncher />
              </div>
            ) : null}
          </div>
        </header>
        <div
          className={`relative mx-auto flex w-full flex-1 flex-col ${
            isDashboard || isHome
              ? "max-w-none px-0 pb-0 pt-0"
              : "max-w-screen-2xl px-4 pb-6 pt-5 sm:px-6 lg:px-8"
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
