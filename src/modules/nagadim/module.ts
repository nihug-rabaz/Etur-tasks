import type { AppModuleDefinition } from "@/shared/modules/types";

export const nagadimModule: AppModuleDefinition = {
  id: "nagadim",
  label: "נגדים",
  description: "איתור ושיבוץ נגדים",
  href: "/nagadim",
  navItems: [
    {
      label: "ראשי",
      href: "/nagadim",
      description: "סקירה ומדדים",
      roles: ["admin", "user", "viewer"],
    },
    {
      label: "איתור פעיל",
      href: "/nagadim/active",
      description: "צינור מועמדים לפי שלבים",
      roles: ["admin", "user", "viewer"],
    },
    {
      label: "תקנים",
      href: "/nagadim/positions",
      description: "תקנים בפער ומועמדים לשיבוץ",
      roles: ["admin", "user", "viewer"],
    },
    {
      label: "פערים",
      href: "/nagadim/gaps",
      description: "סינון לפי סטטוס פער",
      roles: ["admin", "user", "viewer"],
    },
  ],
  adminNavItems: [
    {
      label: "משתמשים",
      href: "/nagadim/admin/users",
      description: "ניהול הרשאות מודול",
    },
  ],
  breadcrumbLabels: {
    nagadim: "נגדים",
    active: "איתור פעיל",
    positions: "תקנים",
    gaps: "פערים",
    admin: "ניהול",
    users: "משתמשים",
  },
};
