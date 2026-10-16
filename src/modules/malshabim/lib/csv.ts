import {
  CANDIDATE_REPORT_COLUMNS,
  candidateToReportRow,
} from "@/modules/malshabim/lib/excel-report";
import type { MalshabimCandidate } from "@/modules/malshabim/types";

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function downloadCandidatesCsv(
  candidates: MalshabimCandidate[],
  filename = "malshabim-candidates.csv",
): void {
  const header = CANDIDATE_REPORT_COLUMNS.map((c) => csvEscape(c.label)).join(",");
  const rows = candidates.map((candidate) => {
    const row = candidateToReportRow(candidate);
    return CANDIDATE_REPORT_COLUMNS.map((col) => csvEscape(row[col.key])).join(",");
  });
  const bom = "\uFEFF";
  const blob = new Blob([bom + [header, ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
