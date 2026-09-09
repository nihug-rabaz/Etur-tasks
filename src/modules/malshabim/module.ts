import type { AppModuleDefinition } from "@/shared/modules/types";

export const malshabimModule: AppModuleDefinition = {
  id: "malshabim",
  label: "מלש״בים",
  description: "ראיונות, תיקי מועמדים, לוח עבודה וסטטיסטיקה למלש״בים",
  href: "/malshabim",
  navItems: [
    {
      label: "ראשי",
      href: "/malshabim",
      description: "רשימת מועמדים וסינון",
      roles: ["admin", "user", "viewer"],
    },
    {
      label: "ראיון",
      href: "/malshabim/interview",
      description: "אשף ראיון רב-שלבי",
      roles: ["admin", "user"],
    },
    {
      label: "לוח",
      href: "/malshabim/board",
      description: "לוח עבודה לפי סטטוס",
      roles: ["admin", "user", "viewer"],
    },
    {
      label: "סטטיסטיקה",
      href: "/malshabim/statistics",
      description: "סיכומים ומדדים",
      roles: ["admin", "user", "viewer"],
    },
  ],
  adminNavItems: [
    {
      label: "אישורים",
      href: "/malshabim/admin/approvals",
      description: "תיקים הממתינים לאישור מנהל",
    },
    {
      label: "משתמשים",
      href: "/malshabim/admin/users",
      description: "ניהול הרשאות מודול",
    },
  ],
  breadcrumbLabels: {
    malshabim: "מלש״בים",
    interview: "ראיון",
    board: "לוח",
    statistics: "סטטיסטיקה",
    candidates: "מועמדים",
    admin: "ניהול",
    users: "משתמשים",
    approvals: "אישורים",
  },
};
