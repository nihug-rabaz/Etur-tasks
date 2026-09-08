import type {
  MalshabimAdvancedStatus,
  MalshabimCandidate,
  MalshabimCandidateStatus,
  MalshabimUpdateLogEntry,
} from "@/modules/malshabim/types";

export const CANDIDATE_STATUSES: MalshabimCandidateStatus[] = [
  "חדש",
  "ממתין לעדכון",
  "בטיפול",
  "הושלם",
];

export const ADVANCED_STATUSES: MalshabimAdvancedStatus[] = [
  "בטיפול",
  "הסתיים טיפול",
  "בהמתנה",
  "אושר",
  "לא אושר",
];

export const STATUS_COLORS: Record<MalshabimCandidateStatus, string> = {
  חדש: "bg-blue-600 text-white",
  "ממתין לעדכון": "bg-orange-600 text-white",
  בטיפול: "bg-primary text-primary-foreground",
  הושלם: "bg-green-600 text-white",
};

export const ADVANCED_STATUS_COLORS: Record<MalshabimAdvancedStatus, string> = {
  בטיפול: "bg-blue-600 text-white",
  "הסתיים טיפול": "bg-green-600 text-white",
  בהמתנה: "bg-amber-600 text-white",
  אושר: "bg-emerald-600 text-white",
  "לא אושר": "bg-destructive text-white",
};

export function getNextStatus(status?: string | null): MalshabimCandidateStatus {
  const currentIndex = CANDIDATE_STATUSES.indexOf(
    (status || "חדש") as MalshabimCandidateStatus,
  );
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;
  return CANDIDATE_STATUSES[(safeIndex + 1) % CANDIDATE_STATUSES.length];
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
  track?: string;
  candidateStatus?: string;
  advancedStatus?: string;
  requestType?: string;
  fromDate?: string;
  toDate?: string;
};

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
    const text = [
      candidate.serial_number,
      candidate.full_name,
      candidate.phone,
      candidate.id_number,
      candidate.personal_number,
      candidate.city,
      candidate.recruitment_track,
      candidate.candidate_status,
      candidate.advanced_status,
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
      (!filters.track || filters.track === "all" || candidate.recruitment_track === filters.track) &&
      (!filters.candidateStatus ||
        filters.candidateStatus === "all" ||
        (candidate.candidate_status || "חדש") === filters.candidateStatus) &&
      (!filters.advancedStatus ||
        filters.advancedStatus === "all" ||
        (candidate.advanced_status || "בטיפול") === filters.advancedStatus) &&
      (!filters.requestType ||
        filters.requestType === "all" ||
        candidate.request_type === filters.requestType) &&
      (!from || (updatedAt && updatedAt >= from)) &&
      (!to || (updatedAt && updatedAt <= to))
    );
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
