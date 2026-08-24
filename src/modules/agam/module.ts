import type { AppModuleDefinition } from "@/shared/modules/types";

export const agamModule: AppModuleDefinition = {
  id: "agam",
  label: "איתור קציני דת",
  description: "מיון לקורס קציני דת — שאלון, הערכות, סמ״ח והחלטת רמ״ד",
  href: "/agam",
  navItems: [
    {
      label: "ראשי",
      href: "/agam",
      description: "סקירת איתור קציני דת",
      roles: ["admin", "user", "ramad", "viewer"],
    },
    {
      label: "מועמדים",
      href: "/agam/candidates",
      description: "תיקי מועמדים ושלבי מיון",
      roles: ["admin", "user", "ramad", "viewer"],
    },
    {
      label: "ארכיון",
      href: "/agam/candidates/archive",
      description: "מועמדים בארכיון",
      roles: ["admin", "ramad"],
    },
  ],
  adminNavItems: [
    {
      label: "ניהול",
      href: "/agam/admin",
      description: "שאלון, קריטריונים והגדרות",
    },
    {
      label: "משתמשים",
      href: "/agam/admin/users",
      description: "ניהול משתמשים ואפליקציות",
    },
  ],
  breadcrumbLabels: {
    agam: "איתור קציני דת",
    candidates: "מועמדים",
    archive: "ארכיון",
    interview: "ראיון",
    evaluation: "הערכה",
    admin: "ניהול",
    users: "משתמשים",
  },
};
