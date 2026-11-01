/** Candidate-uploaded photos of fitness/sports test results (shown under מבחנים וציונים). */
export const SPORTS_RESULTS_DOC_TYPE = "תוצאות ספורט";

export const DOC_TYPES = [
  "חוו״ד 870",
  "סכמ״ר אל״מ",
  "סכמ״ר סא״ל",
  "סימול מזון",
  "תדפיס ת״ש מקוצר",
  "טופס 1004",
  "טופס 102",
  "מסמכים רפואיים מיוחדים",
  SPORTS_RESULTS_DOC_TYPE,
  "קורות חיים",
  "אישור לימודים",
  "אישור רפואי",
  "גיליון ציונים",
  "צילום תעודת זהות",
  "מסמך אחר",
];

export type RequiredDocument = {
  key: string;
  type: string;
  reason: string;
};

const ALWAYS_REQUIRED: RequiredDocument[] = [
  { key: "870", type: "חוו״ד 870", reason: "נדרש לכל מועמד" },
  { key: "food-sim", type: "סימול מזון", reason: "נדרש לכל מועמד" },
  { key: "tash-short", type: "תדפיס ת״ש מקוצר", reason: "נדרש לכל מועמד" },
  { key: "form-1004", type: "טופס 1004", reason: "נדרש לכל מועמד" },
  { key: "form-102", type: "טופס 102", reason: "נדרש לכל מועמד" },
  { key: "medical-special", type: "מסמכים רפואיים מיוחדים", reason: "נדרש לכל מועמד" },
];

/** Required uploads: baseline set for every candidate; סכמ״ר by planning index 2 + דפ״ר. */
export function requiredDocuments(candidate: {
  planning_index: number | null;
  dapar: number | null;
}): RequiredDocument[] {
  const docs: RequiredDocument[] = [...ALWAYS_REQUIRED];
  if (candidate.planning_index === 2 && candidate.dapar != null) {
    docs.push(
      candidate.dapar <= 30
        ? { key: "sakmar-alam", type: "סכמ״ר אל״מ", reason: "מדד תכנוני 2 · דפ״ר 30 ומטה" }
        : { key: "sakmar-saal", type: "סכמ״ר סא״ל", reason: "מדד תכנוני 2 · דפ״ר מעל 30" },
    );
  }
  return docs;
}

function normalizeDocLabel(value: string): string {
  return value.replace(/[״"'׳\s-]/g, "");
}

export function documentMatchesType(
  document: { document_type: string | null; name: string },
  type: string,
): boolean {
  const target = normalizeDocLabel(type);
  if (!target) return false;
  const typeLabel = normalizeDocLabel(document.document_type ?? "");
  const nameLabel = normalizeDocLabel(document.name ?? "");
  return typeLabel.includes(target) || nameLabel.includes(target);
}

export function isSportsResultsDocument(document: {
  document_type: string | null;
  name?: string;
}): boolean {
  return documentMatchesType(
    { document_type: document.document_type, name: document.name ?? "" },
    SPORTS_RESULTS_DOC_TYPE,
  );
}

export const SOURCE_LABELS: Record<string, string> = {
  candidate: "המועמד",
  evaluator: "ממיין",
  ramad: "רמ״ד איתור",
  admin: "מנהל מערכת",
};

export const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png";

/** Serverless request bodies cap at ~4.5MB, so DB-stored files stay under that. */
export const MAX_UPLOAD_BYTES_WITHOUT_BLOB = 4 * 1024 * 1024;
export const MAX_UPLOAD_BYTES_WITH_BLOB = 10 * 1024 * 1024;

export const DB_FILE_PREFIX = "db:";

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isCustomDocType(documentType: string): boolean {
  return documentType === "מסמך אחר" || documentType === "אחר";
}

export function evalCondition(
  operator: string | null | undefined,
  value: unknown,
  expected: string | null | undefined,
): boolean {
  if (!expected && expected !== "0") return true;
  const op = operator || "eq";
  const left = value;
  const right = expected;
  switch (op) {
    case "neq":
      return String(left) !== String(right);
    case "gt":
      return Number(left) > Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lte":
      return Number(left) <= Number(right);
    case "eq":
    default:
      return String(left) === String(right);
  }
}
