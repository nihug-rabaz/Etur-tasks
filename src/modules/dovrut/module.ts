import type { AppModuleDefinition } from "@/shared/modules/types";

export const dovrutModule: AppModuleDefinition = {
  id: "dovrut",
  label: "דוברות",
  description: "פרויקטים תקשורתיים, קונספטים וציר אישורים",
  href: "/dovrut",
  navItems: [
    { label: "ראשי", href: "/dovrut", description: "סקירת דוברות", roles: ["admin", "user"] },
    {
      label: "פרויקטים",
      href: "/dovrut/projects",
      description: "קמפיינים תקשורתיים",
      roles: ["admin", "user"],
    },
    {
      label: "קונספטים",
      href: "/dovrut/concepts",
      description: "כתבות ורשתות",
      roles: ["admin", "user"],
    },
    {
      label: "חיפוש חדשות",
      href: "/dovrut/news",
      description: "חיפוש בגוגל חדשות",
      roles: ["admin", "user"],
    },
    {
      label: "אישור קונספטים",
      href: "/dovrut/approvals",
      description: "אישור לפי קוד",
      roles: ["admin", "user", "approver"],
    },
    {
      label: "רמ״ח",
      href: "/dovrut/approval/branch-head",
      description: "תור אישור רמ״ח",
      roles: ["admin", "user", "approver"],
    },
    {
      label: "רמ״ט",
      href: "/dovrut/approval/deputy-commander",
      description: "תור אישור רמ״ט",
      roles: ["admin", "user", "approver"],
    },
    {
      label: "רבצ״ר",
      href: "/dovrut/approval/chief-rabbi",
      description: "תור אישור רבצ״ר",
      roles: ["admin", "user", "approver"],
    },
  ],
  adminNavItems: [
    {
      label: "משתמשי מודול",
      href: "/dovrut/admin/users",
      description: "תפקידים במודול דוברות",
    },
    {
      label: "ניהול מאשרים",
      href: "/dovrut/admin/approvers",
      description: "טלפונים והודעות WhatsApp",
    },
  ],
  breadcrumbLabels: {
    dovrut: "דוברות",
    projects: "פרויקטים",
    concepts: "קונספטים",
    news: "חדשות",
    approvals: "אישורים",
    approval: "אישור",
    "branch-head": "רמ״ח",
    "deputy-commander": "רמ״ט",
    "chief-rabbi": "רבצ״ר",
    admin: "ניהול",
    users: "משתמשים",
    approvers: "מאשרים",
  },
};
