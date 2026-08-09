import type { AppModuleDefinition } from "@/shared/modules/types";

export const dovrutModule: AppModuleDefinition = {
  id: "dovrut",
  label: "דוברות",
  description: "קמפיינים, פרויקטים, פריטים וציר אישורים",
  href: "/dovrut",
  navItems: [
    { label: "ראשי", href: "/dovrut", description: "סקירת דוברות", roles: ["admin", "user"] },
    {
      label: "קמפיינים",
      href: "/dovrut/campaigns",
      description: "קמפיינים תקשורתיים",
      roles: ["admin", "user"],
    },
    {
      label: "פרויקטים",
      href: "/dovrut/projects",
      description: "פרויקטים תחת קמפיינים",
      roles: ["admin", "user"],
    },
    {
      label: "פריטים",
      href: "/dovrut/items",
      description: "כתבות ורשתות",
      roles: ["admin", "user"],
    },
    {
      label: "קהלי יעד",
      href: "/dovrut/audiences",
      description: "מסרים לקהל יעד ולתחום",
      roles: ["admin", "user"],
    },
    {
      label: "חיפוש חדשות",
      href: "/dovrut/news",
      description: "חיפוש בגוגל חדשות",
      roles: ["admin", "user"],
    },
    {
      label: "אישור פריטים",
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
      description: "תור אישור רבצ״ר · דשבורד הרב קובי",
      roles: ["admin", "user", "approver"],
    },
  ],
  adminNavItems: [
    {
      label: "משתמשי מודול",
      href: "/dovrut/admin/users",
      description: "תפקידים במודול דוברות (מנהל / חפ״ש / מאשר)",
    },
    {
      label: "ניהול מאשרים",
      href: "/dovrut/admin/approvers",
      description: "תזכורות אישור בטלגרם",
    },
  ],
  breadcrumbLabels: {
    dovrut: "דוברות",
    campaigns: "קמפיינים",
    projects: "פרויקטים",
    concepts: "פריטים",
    items: "פריטים",
    audiences: "קהלי יעד",
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
