import type { DovrutApprovalStatus, DovrutDomain } from "@/modules/dovrut/types";

export const DOVRUT_DOMAIN_FLOWS: Record<DovrutDomain, DovrutApprovalStatus[]> = {
  kashrut: ["waiting_branch_head", "waiting_deputy_commander", "waiting_chief_rabbi", "approved"],
  halacha: ["waiting_branch_head", "waiting_deputy_commander", "waiting_chief_rabbi", "approved"],
  reut: ["waiting_branch_head", "waiting_deputy_commander", "waiting_chief_rabbi", "approved"],
  tipuch: ["waiting_deputy_commander", "waiting_chief_rabbi", "approved"],
  lehaka: ["waiting_deputy_commander", "waiting_chief_rabbi", "approved"],
  zuq: ["waiting_deputy_commander", "waiting_chief_rabbi", "approved"],
  masan: ["waiting_deputy_commander", "waiting_chief_rabbi", "approved"],
  agam_hachsharot: ["waiting_deputy_commander", "waiting_chief_rabbi", "approved"],
  logistic: ["waiting_deputy_commander", "waiting_chief_rabbi", "approved"],
  field: ["waiting_deputy_commander", "waiting_chief_rabbi", "approved"],
};

export function getInitialApprovalStatus(domain: DovrutDomain | null | undefined): DovrutApprovalStatus {
  if (!domain) return "waiting_deputy_commander";
  const flow = DOVRUT_DOMAIN_FLOWS[domain];
  return flow[0] ?? "waiting_deputy_commander";
}

export function getNextApprovalStatus(
  domain: DovrutDomain | null | undefined,
  current: DovrutApprovalStatus,
): DovrutApprovalStatus | null {
  if (!domain) return null;
  const flow = DOVRUT_DOMAIN_FLOWS[domain];
  const index = flow.indexOf(current);
  if (index < 0) return null;
  if (index >= flow.length - 1) return "approved";
  return flow[index + 1] ?? null;
}

export const APPROVAL_STATUS_LABELS: Record<DovrutApprovalStatus, string> = {
  waiting_spokesperson_officer: "ממתין לקצין דוברות",
  waiting_branch_head: "ממתין לרמ״ח",
  waiting_deputy_commander: "ממתין לרמ״ט",
  waiting_chief_rabbi: "ממתין לרבצ״ר",
  waiting_command_rabbi: "ממתין לרב פיקוד",
  approved: "אושר",
};

export const DOMAIN_LABELS: Record<DovrutDomain, string> = {
  kashrut: "כשרות",
  halacha: "הלכה",
  reut: "רעות",
  tipuch: "טיפוח",
  lehaka: "להקה",
  zuq: "צוק",
  masan: "מסע\"ן",
  agam_hachsharot: "אג\"ם הכשרות",
  logistic: "לוגיסטיקה",
  field: "שדה",
};

export const WORK_STATUS_ARTICLE_LABELS: Record<string, string> = {
  planning: "תכנון",
  production: "הפקה",
  waiting_approvals: "ממתין לאישורים",
  waiting_spokesperson: "ממתין לדובר",
  waiting_publish: "ממתין לפרסום",
  published: "פורסם",
};

export const WORK_STATUS_SOCIAL_LABELS: Record<string, string> = {
  planning: "תכנון",
  production: "הפקה",
  waiting_approval: "ממתין לאישור",
  waiting_publish: "ממתין לפרסום",
  published: "פורסם",
};
