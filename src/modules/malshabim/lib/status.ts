import type {
  MalshabimCandidate,
  MalshabimCandidateStatus,
  MalshabimUpdateLogEntry,
} from "@/modules/malshabim/types";

export const CANDIDATE_STATUSES: MalshabimCandidateStatus[] = [
  "בטיפול",
  "אושר ושובץ",
  "אושר ולא שובץ",
  "לא אושר",
];

export const INSTRUCTION_STATUSES = ["בטיפול", "הושלם"] as const;

/** Solid status tones — safe on chips, StatCards, and board column headers. */
export const STATUS_COLORS: Record<MalshabimCandidateStatus, string> = {
  בטיפול: "bg-amber-500 text-white",
  "אושר ושובץ": "bg-violet-600 text-white",
  "אושר ולא שובץ": "bg-emerald-600 text-white",
  "לא אושר": "bg-rose-600 text-white",
};

/** Extra emphasis for compact badges (list / search / file). */
export const STATUS_BADGE_CLASS: Record<MalshabimCandidateStatus, string> = {
  בטיפול: `${STATUS_COLORS["בטיפול"]} shadow-sm shadow-amber-500/35`,
  "אושר ושובץ": `${STATUS_COLORS["אושר ושובץ"]} shadow-sm shadow-violet-600/35`,
  "אושר ולא שובץ": `${STATUS_COLORS["אושר ולא שובץ"]} shadow-sm shadow-emerald-600/35`,
  "לא אושר": `${STATUS_COLORS["לא אושר"]} shadow-sm shadow-rose-600/35`,
};

/** Map legacy stored values to the current status set */
export function normalizeCandidateStatus(
  status?: string | null,
): MalshabimCandidateStatus {
  switch (status) {
    case "בטיפול":
    case "אושר ושובץ":
    case "אושר ולא שובץ":
    case "לא אושר":
      return status;
    case "שובץ":
      return "אושר ושובץ";
    case "אושר":
    case "הושלם":
      return "אושר ולא שובץ";
    case "ממתין לריאיון":
    case "חדש":
    case "ממתין לעדכון":
      return "בטיפול";
    default:
      return "בטיפול";
  }
}

export function getLastStatusUpdateDate(
  candidate: Pick<MalshabimCandidate, "update_log" | "updated_at"> & {
    updated_date?: string | null;
  },
): string | null {
  const statusLogs = (candidate.update_log || [])
    .filter((log: MalshabimUpdateLogEntry) => {
      const changes = log.changes || "";
      // Ignore instruction-status logs; match work-status updates only.
      if (changes.includes("הנחיה")) return false;
      return (
        changes.includes("סטטוס עודכן") ||
        changes.includes("candidate_status") ||
        /^סטטוס\b/.test(changes.trim())
      );
    })
    .map((log) => log.date)
    .filter(Boolean) as string[];
  if (statusLogs.length) {
    return statusLogs.reduce((latest, date) =>
      new Date(date) > new Date(latest) ? date : latest,
    );
  }
  return candidate.updated_date ?? candidate.updated_at ?? null;
}

/** Sentinel in multi-select filters for empty / missing field values ("ללא"). */
export const FILTER_EMPTY_VALUE = "__empty__";

export type MalshabimCandidateFilters = {
  search?: string;
  track?: string | string[];
  candidateStatus?: string | string[];
  statusType?: string | string[];
  requestType?: string | string[];
  fromDate?: string;
  toDate?: string;
  /** Filter by request_meta.unit */
  unit?: string | string[];
  /** Selected enlistment months as YYYY-MM values (multi-select). */
  enlistmentMonths?: string[];
};

const HEBREW_MONTHS = [
  "ינו׳",
  "פבר׳",
  "מרץ",
  "אפר׳",
  "מאי",
  "יונ׳",
  "יול׳",
  "אוג׳",
  "ספט׳",
  "אוק׳",
  "נוב׳",
  "דצמ׳",
] as const;

/** Build month options for enlistment filters (e.g. "מרץ 26"). */
export function buildEnlistmentMonthOptions(
  fromYear = 2025,
  toYear = 2028,
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  for (let year = fromYear; year <= toYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const value = `${year}-${String(month).padStart(2, "0")}`;
      const yy = String(year).slice(-2);
      options.push({ value, label: `${HEBREW_MONTHS[month - 1]} ${yy}` });
    }
  }
  return options;
}

function enlistmentMonthKey(enlistmentDate?: string | null): string | null {
  if (!enlistmentDate) return null;
  const date = new Date(enlistmentDate);
  if (Number.isNaN(date.getTime())) {
    const match = /^(\d{4})-(\d{2})/.exec(enlistmentDate.trim());
    return match ? `${match[1]}-${match[2]}` : null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Board sketch buckets — overlay on candidate_status + awaiting_admin_approval. */
export type MalshabimBoardBucket = "awaiting" | "open" | "done";

export function getBoardBucket(
  candidate: Pick<MalshabimCandidate, "candidate_status" | "awaiting_admin_approval">,
): MalshabimBoardBucket {
  if (candidate.awaiting_admin_approval) return "awaiting";
  const status = normalizeCandidateStatus(candidate.candidate_status);
  if (status === "בטיפול") return "open";
  return "done";
}

export const BOARD_BUCKET_LABELS: Record<MalshabimBoardBucket, string> = {
  awaiting: "ממתינים לאישור",
  open: "בטיפול",
  done: "הושלמו",
};

function matchesMulti(filter: string | string[] | undefined, value: string | null | undefined) {
  if (!filter || filter === "all") return true;
  const list = Array.isArray(filter) ? filter : [filter];
  if (list.length === 0 || list.includes("all")) return true;
  const normalized = (value || "").trim();
  return list.some((item) => {
    if (item === FILTER_EMPTY_VALUE) return normalized === "";
    return item === normalized;
  });
}

export function filterCandidates<T extends MalshabimCandidate>(
  candidates: T[],
  filters: MalshabimCandidateFilters,
): T[] {
  const query = (filters.search || "").trim().toLowerCase();
  const from = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
  const to = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null;

  const enlistmentMonths = (filters.enlistmentMonths || []).filter(Boolean);

  return candidates.filter((candidate) => {
    const lastStatusUpdate = getLastStatusUpdateDate(candidate);
    const updatedAt = lastStatusUpdate ? new Date(lastStatusUpdate) : null;
    const status = normalizeCandidateStatus(candidate.candidate_status);
    const meta = candidate.request_meta || {};
    const enlistmentMonth = enlistmentMonthKey(candidate.enlistment_date);
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
      meta.requester,
      meta.unit,
      meta.role,
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

    const matchesEnlistmentMonths =
      enlistmentMonths.length === 0 ||
      (Boolean(enlistmentMonth) && enlistmentMonths.includes(enlistmentMonth as string));

    return (
      (!query || text.includes(query)) &&
      matchesMulti(filters.track, candidate.recruitment_track) &&
      matchesMulti(filters.candidateStatus, status) &&
      matchesMulti(filters.statusType, candidate.status_type) &&
      matchesMulti(filters.requestType, candidate.request_type) &&
      matchesMulti(
        filters.unit,
        typeof meta.unit === "string" ? meta.unit.trim() : meta.unit,
      ) &&
      (!from || (updatedAt && updatedAt >= from)) &&
      (!to || (updatedAt && updatedAt <= to)) &&
      matchesEnlistmentMonths
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
