import type { MalshabimCandidate } from "@/modules/malshabim/types";

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

const COLUMNS: Array<{ key: keyof MalshabimCandidate | "quiz_passed_label"; label: string }> = [
  { key: "serial_number", label: "מס׳ תיק" },
  { key: "full_name", label: "שם" },
  { key: "phone", label: "טלפון" },
  { key: "id_number", label: "ת.ז" },
  { key: "personal_number", label: "מ.א" },
  { key: "city", label: "עיר" },
  { key: "recruitment_track", label: "מסלול" },
  { key: "candidate_status", label: "סטטוס" },
  { key: "advanced_status", label: "סטטוס מורחב" },
  { key: "request_type", label: "איתור/בקשה" },
  { key: "quiz_passed_label", label: "עבר מבחן" },
];

export function downloadCandidatesCsv(
  candidates: MalshabimCandidate[],
  filename = "malshabim-candidates.csv",
): void {
  const header = COLUMNS.map((c) => csvEscape(c.label)).join(",");
  const rows = candidates.map((c) =>
    COLUMNS.map((col) => {
      if (col.key === "quiz_passed_label") return csvEscape(c.quiz_passed ? "כן" : "לא");
      return csvEscape(c[col.key as keyof MalshabimCandidate]);
    }).join(","),
  );
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
