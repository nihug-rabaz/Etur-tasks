import type { DovrutApprovalStatus, DovrutWorkStatus } from "@/modules/dovrut/types";

export interface ApprovalRequirementFlags {
  requires_branch_head: boolean;
  requires_deputy_commander: boolean;
  requires_chief_rabbi: boolean;
}

export const DEFAULT_APPROVAL_FLAGS: ApprovalRequirementFlags = {
  requires_chief_rabbi: true,
  requires_deputy_commander: true,
  requires_branch_head: false,
};

export function buildApprovalFlow(flags: ApprovalRequirementFlags): DovrutApprovalStatus[] {
  const flow: DovrutApprovalStatus[] = [];
  if (flags.requires_branch_head) flow.push("waiting_branch_head");
  if (flags.requires_deputy_commander) flow.push("waiting_deputy_commander");
  if (flags.requires_chief_rabbi) flow.push("waiting_chief_rabbi");
  flow.push("approved");
  return flow;
}

export function getInitialApprovalStatus(flags: ApprovalRequirementFlags): DovrutApprovalStatus {
  const flow = buildApprovalFlow(flags);
  return flow[0] ?? "approved";
}

export function getNextApprovalStatus(
  flags: ApprovalRequirementFlags,
  current: DovrutApprovalStatus,
): DovrutApprovalStatus | null {
  const flow = buildApprovalFlow(flags);
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

export const DOMAIN_LABELS: Record<string, string> = {
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

export const WORK_STATUS_LABELS: Record<DovrutWorkStatus, string> = {
  planning: "תכנון",
  production: "ביצוע",
  waiting_approvals: "ממתין לאישורים",
  approved: "מאושר",
};

export const WORK_STATUS_ARTICLE_LABELS = WORK_STATUS_LABELS;
export const WORK_STATUS_SOCIAL_LABELS = WORK_STATUS_LABELS;

export const WORK_STATUS_ORDER: DovrutWorkStatus[] = [
  "planning",
  "production",
  "waiting_approvals",
  "approved",
];
