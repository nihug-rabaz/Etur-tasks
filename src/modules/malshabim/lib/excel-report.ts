import * as XLSX from "xlsx";
import { formatDateTime } from "@/modules/malshabim/lib/status";
import type { MalshabimCandidate } from "@/modules/malshabim/types";

export type CandidateReportColumn = {
  key: string;
  label: string;
};

/** Full candidate-file report columns (matches the operational Excel export). */
export const CANDIDATE_REPORT_COLUMNS: CandidateReportColumn[] = [
  { key: "serial_number", label: "מס׳ תיק" },
  { key: "full_name", label: "שם מלא" },
  { key: "phone", label: "פלאפון" },
  { key: "id_number", label: "תעודת זהות" },
  { key: "personal_number", label: "מספר אישי" },
  { key: "recruitment_track", label: "מסלול גיוס" },
  { key: "status_type", label: "סטטוס אישי" },
  { key: "work_status", label: "סטטוס עבודה" },
  { key: "advanced_status", label: "סטטוס מורחב" },
  { key: "request_type", label: "איחור/בקשה" },
  { key: "interview_at", label: "מועד ראיון" },
  { key: "next_status_update_at", label: "תזכורת עדכון סטטוס" },
  { key: "quiz_score", label: "ציון מבחן" },
  { key: "quiz_passed", label: "עבר מבחן" },
  { key: "interview_summary", label: "סיכום ראיון" },
];

export function candidateToReportRow(
  candidate: MalshabimCandidate,
): Record<string, unknown> {
  return {
    serial_number: candidate.serial_number ?? "",
    full_name: candidate.full_name ?? "",
    phone: candidate.phone ?? "",
    id_number: candidate.id_number ?? "",
    personal_number: candidate.personal_number ?? "",
    recruitment_track: candidate.recruitment_track ?? "",
    status_type: candidate.status_type ?? "",
    work_status: candidate.candidate_status ?? "",
    advanced_status: candidate.advanced_status ?? "",
    request_type: candidate.request_type ?? "",
    interview_at: formatDateTime(candidate.interview_at),
    next_status_update_at: formatDateTime(candidate.next_status_update_at),
    quiz_score: candidate.quiz_score ?? "",
    quiz_passed: candidate.quiz_passed ? "כן" : "לא",
    interview_summary: candidate.interview_summary ?? "",
  };
}

export function downloadCandidatesExcel(
  candidates: MalshabimCandidate[],
  filename = `דוח-מועמדים-${new Date().toISOString().slice(0, 10)}.xlsx`,
): void {
  const normalizedFilename = filename.toLowerCase().endsWith(".xlsx")
    ? filename
    : `${filename.replace(/\.xls(x)?$/i, "")}.xlsx`;
  const headerRow = CANDIDATE_REPORT_COLUMNS.map((column) => column.label);
  const bodyRows = candidates.map((candidate) => {
    const row = candidateToReportRow(candidate);
    return CANDIDATE_REPORT_COLUMNS.map((column) => {
      const value = row[column.key];
      if (value == null) return "";
      return value;
    });
  });
  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);
  worksheet["!cols"] = CANDIDATE_REPORT_COLUMNS.map((column) => ({
    wch:
      column.key === "interview_summary"
        ? 60
        : Math.min(36, Math.max(12, column.label.length + 4)),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "מועמדים");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = normalizedFilename;
  link.click();
  URL.revokeObjectURL(url);
}
