import * as XLSX from "xlsx";

export const MALSHABIM_TEMPLATE_COLUMNS = [
  "full_name",
  "phone",
  "id_number",
  "personal_number",
  "city",
  "recruitment_track",
  "enlistment_date",
  "status_type",
  "request_type",
  "request_requester",
  "request_unit",
  "request_role",
] as const;

export type MalshabimTemplateColumn = (typeof MALSHABIM_TEMPLATE_COLUMNS)[number];

export const MALSHABIM_TEMPLATE_HEADERS: Record<MalshabimTemplateColumn, string> = {
  full_name: "שם מלא",
  phone: "טלפון",
  id_number: "תעודת זהות",
  personal_number: "מספר אישי",
  city: "עיר",
  recruitment_track: "מסלול גיוס",
  enlistment_date: "תאריך גיוס",
  status_type: "סטטוס",
  request_type: "איתור / בקשה",
  request_requester: "שם הפונה",
  request_unit: "יחידה",
  request_role: "תפקיד",
};

const HEADER_TO_COLUMN = new Map<string, MalshabimTemplateColumn>([
  ...MALSHABIM_TEMPLATE_COLUMNS.map(
    (key) => [key, key] as [string, MalshabimTemplateColumn],
  ),
  ...MALSHABIM_TEMPLATE_COLUMNS.map(
    (key) =>
      [MALSHABIM_TEMPLATE_HEADERS[key], key] as [string, MalshabimTemplateColumn],
  ),
]);

export type MalshabimTemplateRow = Partial<Record<MalshabimTemplateColumn, string>>;

/** Download an empty xlsx template for malshabim import. */
export function exportTemplate(filename = "תבנית-מלשבים.xlsx"): void {
  const worksheet = XLSX.utils.aoa_to_sheet([
    MALSHABIM_TEMPLATE_COLUMNS.map((key) => MALSHABIM_TEMPLATE_HEADERS[key]),
    Array(MALSHABIM_TEMPLATE_COLUMNS.length).fill(""),
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "תבנית");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function resolveColumnKey(header: string): MalshabimTemplateColumn | null {
  const trimmed = header.trim();
  return HEADER_TO_COLUMN.get(trimmed) ?? null;
}

function excelSerialToIso(serial: number): string | null {
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return null;
  const yyyy = String(parsed.y).padStart(4, "0");
  const mm = String(parsed.m).padStart(2, "0");
  const dd = String(parsed.d).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function localDateToIso(date: Date): string {
  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function cellToString(raw: unknown, column: MalshabimTemplateColumn): string {
  if (raw == null || raw === "") return "";
  if (column === "enlistment_date") {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return excelSerialToIso(raw) ?? "";
    }
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      return localDateToIso(raw);
    }
    const text = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    if (/^\d+(\.\d+)?$/.test(text)) {
      const serial = Number(text);
      if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
        return excelSerialToIso(serial) ?? text;
      }
    }
    return text;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return localDateToIso(raw);
  }
  return String(raw).trim();
}

/** Parse an xlsx/xls File into row objects keyed by template columns. */
export async function parseTemplateFile(file: File): Promise<MalshabimTemplateRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  return rows.map((row) => {
    const mapped: MalshabimTemplateRow = {};
    for (const [header, raw] of Object.entries(row)) {
      const key = resolveColumnKey(header);
      if (!key) continue;
      mapped[key] = cellToString(raw, key);
    }
    return mapped;
  });
}

/** Map template rows to import API candidate payloads. */
export function templateRowsToImportPayload(rows: MalshabimTemplateRow[]) {
  return rows
    .filter((row) =>
      Boolean(row.full_name || row.id_number || row.phone || row.personal_number),
    )
    .map((row) => ({
      full_name: row.full_name || null,
      phone: row.phone || null,
      id_number: row.id_number || null,
      personal_number: row.personal_number || null,
      city: row.city || null,
      recruitment_track: row.recruitment_track || null,
      enlistment_date: row.enlistment_date || null,
      status_type: row.status_type || null,
      request_type: row.request_type || null,
      request_meta: {
        requester: row.request_requester || null,
        unit: row.request_unit || null,
        role: row.request_role || null,
      },
      is_draft: false,
    }));
}
