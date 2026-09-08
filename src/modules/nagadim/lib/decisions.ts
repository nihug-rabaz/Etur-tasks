import type { NagadimGapStatus, NagadimPositionDecision } from "@/modules/nagadim/types";

export const POSITION_DECISIONS: NagadimPositionDecision[] = [
  "לא רצו אותו",
  "לא רצה את התפקיד",
  "גויס",
  "במילואים בניסיון",
  "אחר",
];

export const MAX_POSITION_CANDIDATES = 8;

export const GAP_STATUSES: NagadimGapStatus[] = ["open", "closed", "permanently_closed"];

export const GAP_STATUS_LABELS: Record<NagadimGapStatus, string> = {
  open: "פתוח",
  closed: "סגור",
  permanently_closed: "סגור קבוע",
};

export function isGapStatus(value: string | null | undefined): value is NagadimGapStatus {
  return Boolean(value && (GAP_STATUSES as string[]).includes(value));
}

export function isPositionDecision(
  value: string | null | undefined,
): value is NagadimPositionDecision {
  return Boolean(value && (POSITION_DECISIONS as string[]).includes(value));
}

export function gapStatusTone(status: NagadimGapStatus): string {
  if (status === "open") return "bg-emerald-600 text-white";
  if (status === "closed") return "bg-amber-600 text-white";
  return "bg-slate-600 text-white";
}
