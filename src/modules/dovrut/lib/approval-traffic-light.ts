import {
  buildApprovalFlow,
  type ApprovalRequirementFlags,
} from "@/modules/dovrut/lib/approval-flows";
import type { DovrutApprovalStatus, DovrutConcept } from "@/modules/dovrut/types";

export type ApprovalTrafficLightStatus =
  | "approved"
  | "current"
  | "pending"
  | "rejected"
  | "skipped";

export type ApprovalTrafficStep = Extract<
  DovrutApprovalStatus,
  "waiting_branch_head" | "waiting_deputy_commander" | "waiting_chief_rabbi"
>;

export const APPROVAL_TRAFFIC_STEPS: ApprovalTrafficStep[] = [
  "waiting_branch_head",
  "waiting_deputy_commander",
  "waiting_chief_rabbi",
];

function flagsFromConcept(concept: Pick<
  DovrutConcept,
  "requires_branch_head" | "requires_deputy_commander" | "requires_chief_rabbi"
>): ApprovalRequirementFlags {
  return {
    requires_branch_head: Boolean(concept.requires_branch_head),
    requires_deputy_commander: Boolean(concept.requires_deputy_commander),
    requires_chief_rabbi: Boolean(concept.requires_chief_rabbi),
  };
}

/**
 * Per-step traffic-light status for the article approval chain.
 * - approved: step already passed
 * - current: waiting on this step
 * - pending / not-yet-reached: later required step
 * - rejected: last rejection happened at this step
 * - skipped: step not required for this concept
 */
export function getApprovalTrafficLights(
  concept: Pick<
    DovrutConcept,
    | "requires_branch_head"
    | "requires_deputy_commander"
    | "requires_chief_rabbi"
    | "approval_status"
    | "rejected_at_step"
  >,
): Record<ApprovalTrafficStep, ApprovalTrafficLightStatus> {
  const flags = flagsFromConcept(concept);
  const flow = buildApprovalFlow(flags).filter(
    (step): step is ApprovalTrafficStep => step !== "approved",
  );
  const current = concept.approval_status;
  const rejectedAt = concept.rejected_at_step;
  const currentIndex = current && current !== "approved" ? flow.indexOf(current as ApprovalTrafficStep) : -1;
  const fullyApproved = current === "approved";

  const result = {} as Record<ApprovalTrafficStep, ApprovalTrafficLightStatus>;
  for (const step of APPROVAL_TRAFFIC_STEPS) {
    if (!flow.includes(step)) {
      result[step] = "skipped";
      continue;
    }
    if (rejectedAt === step) {
      result[step] = "rejected";
      continue;
    }
    if (fullyApproved) {
      result[step] = "approved";
      continue;
    }
    if (current === step) {
      result[step] = "current";
      continue;
    }
    const stepIndex = flow.indexOf(step);
    if (currentIndex >= 0 && stepIndex < currentIndex) {
      result[step] = "approved";
      continue;
    }
    result[step] = "pending";
  }
  return result;
}

export function trafficLightColorClass(status: ApprovalTrafficLightStatus): string {
  switch (status) {
    case "approved":
      return "bg-emerald-500 text-white border-emerald-600";
    case "current":
      return "bg-amber-400 text-amber-950 border-amber-500";
    case "rejected":
      return "bg-red-500 text-white border-red-600";
    case "skipped":
      return "bg-slate-300 text-slate-700 border-slate-400 dark:bg-slate-600 dark:text-slate-100";
    case "pending":
      return "bg-violet-400 text-violet-950 border-violet-500";
  }
}

export function trafficLightDotClass(status: ApprovalTrafficLightStatus): string {
  switch (status) {
    case "approved":
      return "bg-emerald-500";
    case "current":
      return "bg-amber-400";
    case "rejected":
      return "bg-red-500";
    case "skipped":
      return "bg-slate-400";
    case "pending":
      return "bg-violet-400";
  }
}

export function trafficLightLabel(status: ApprovalTrafficLightStatus): string {
  switch (status) {
    case "approved":
      return "אושר";
    case "current":
      return "ממתין";
    case "rejected":
      return "נדחה";
    case "skipped":
      return "לא נדרש";
    case "pending":
      return "טרם הגיע";
  }
}
