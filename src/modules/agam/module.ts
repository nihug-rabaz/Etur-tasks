import type { AppModuleDefinition } from "@/shared/modules/types";

export const agamModule: AppModuleDefinition = {
  id: "agam",
  label: "קצינים",
  description: "מיון לקורס קציני דת — שאלון, הערכות, סמ״ח והחלטה",
  href: "/agam",
  navItems: [
    {
      label: "ראשי",
      href: "/agam",
      description: "סקירת קצינים",
      roles: ["admin", "user", "ramad", "viewer"],
    },
    {
      label: "מחזורים",
      href: "/agam/cycles",
      description: "ניהול מחזורי מועמדים",
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
    agam: "קצינים",
    cycles: "מחזורים",
    candidates: "מועמדים",
    archive: "ארכיון",
    interview: "ראיון",
    evaluation: "הערכה",
    admin: "ניהול",
    users: "משתמשים",
    portal: "פורטל מועמד",
    bahad1: "הכנות לבה״ד 1",
  },
};
