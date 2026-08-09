import type { AppModuleDefinition } from "@/shared/modules/types";

export const tasksModule: AppModuleDefinition = {
  id: "tasks",
  label: "ניהול משימות",
  description: "משימות, פרויקטים, תחומים ולו״ז יומי",
  href: "/dashboard",
  navItems: [
    { label: "ראשי", href: "/dashboard", description: "סקירה כללית של הכל" },
    { label: "משימות פעילות", href: "/tasks/active", description: "מה עובד עכשיו" },
    { label: "לוח זמנים", href: "/tasks/upcoming", description: "משימות, פגישות ולו״זים" },
    { label: "ארכיון", href: "/tasks/archive", description: "משימות שהושלמו" },
    {
      label: "משתמשים",
      href: "/admin/users",
      description: "ניהול חברי הצוות",
      adminOnly: true,
    },
  ],
  adminNavItems: [
    {
      label: "הגדרות מערכת",
      href: "/admin/settings",
      description: "איקונים ותצוגת טאבים",
    },
  ],
  breadcrumbLabels: {
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
  },
};
