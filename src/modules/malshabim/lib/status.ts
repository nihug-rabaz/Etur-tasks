import type {
  MalshabimCandidate,
  MalshabimCandidateStatus,
  MalshabimUpdateLogEntry,
} from "@/modules/malshabim/types";

export const CANDIDATE_STATUSES: MalshabimCandidateStatus[] = [
  "ממתין לריאיון",
  "בטיפול",
  "אושר",
  "שובץ",
];

export const INSTRUCTION_STATUSES = ["בטיפול", "הושלם"] as const;

export const STATUS_COLORS: Record<MalshabimCandidateStatus, string> = {
  "ממתין לריאיון": "bg-blue-600 text-white",
  בטיפול: "bg-amber-500 text-white",
  אושר: "bg-emerald-600 text-white",
  שובץ: "bg-violet-600 text-white",
};

/** Map legacy stored values to the new status set */
export function normalizeCandidateStatus(
  status?: string | null,
): MalshabimCandidateStatus {
  switch (status) {
    case "ממתין לריאיון":
    case "בטיפול":
    case "אושר":
    case "שובץ":
      return status;
    case "חדש":
      return "ממתין לריאיון";
    case "ממתין לעדכון":
      return "בטיפול";
    case "הושלם":
      return "אושר";
    default:
      return "ממתין לריאיון";
  }
}

export function getLastStatusUpdateDate(
  candidate: Pick<MalshabimCandidate, "update_log" | "updated_at"> & {
    updated_date?: string | null;
  },
): string | null {
  const statusLogs = (candidate.update_log || [])
    .filter((log: MalshabimUpdateLogEntry) => (log.changes || "").includes("סטטוס"))
    .map((log) => log.date)
    .filter(Boolean) as string[];
  if (statusLogs.length) return statusLogs[statusLogs.length - 1];
  return candidate.updated_date ?? candidate.updated_at ?? null;
}

export type MalshabimCandidateFilters = {
  search?: string;
  track?: string | string[];
  candidateStatus?: string | string[];
  requestType?: string | string[];
  fromDate?: string;
  toDate?: string;
};

function matchesMulti(filter: string | string[] | undefined, value: string | null | undefined) {
  if (!filter || filter === "all") return true;
  const list = Array.isArray(filter) ? filter : [filter];
  if (list.length === 0 || list.includes("all")) return true;
  return list.includes(value || "");
}

export function filterCandidates<T extends MalshabimCandidate>(
  candidates: T[],
  filters: MalshabimCandidateFilters,
): T[] {
  const query = (filters.search || "").trim().toLowerCase();
  const from = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
  const to = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null;

  return candidates.filter((candidate) => {
    const lastStatusUpdate = getLastStatusUpdateDate(candidate);
    const updatedAt = lastStatusUpdate ? new Date(lastStatusUpdate) : null;
    const status = normalizeCandidateStatus(candidate.candidate_status);
    const text = [
      candidate.serial_number,
      candidate.full_name,
      candidate.phone,
      candidate.id_number,
      candidate.personal_number,
      candidate.city,
      candidate.recruitment_track,
      status,
      candidate.status_type,
      candidate.request_type,
      candidate.interview_summary,
      candidate.instructions,
      candidate.interviewer_notes,
      ...(candidate.quiz_questions || []).flatMap((q) => [q.question, q.answer]),
      ...(candidate.update_log || []).map(
        (log) => `${log.changes || ""} ${log.updated_by || ""}`,
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!query || text.includes(query)) &&
      matchesMulti(filters.track, candidate.recruitment_track) &&
      matchesMulti(filters.candidateStatus, status) &&
      matchesMulti(filters.requestType, candidate.request_type) &&
      (!from || (updatedAt && updatedAt >= from)) &&
      (!to || (updatedAt && updatedAt <= to))
    );
  });
}

export function enlistmentYearGroup(enlistmentDate?: string | null): string {
  if (!enlistmentDate) return "ללא שנתון";
  const year = new Date(enlistmentDate).getFullYear();
  return Number.isFinite(year) ? String(year) : "ללא שנתון";
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
