export const DOC_TYPES = [
  "קורות חיים",
  "אישור לימודים",
  "אישור רפואי",
  "גיליון ציונים",
  "צילום תעודת זהות",
  "מסמך אחר",
];

export const SOURCE_LABELS: Record<string, string> = {
  candidate: "המועמד",
  evaluator: "מעריך",
  ramad: "רמ״ד איתור",
  admin: "מנהל מערכת",
};

export const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png";

export const MAX_UPLOAD_BYTES_WITHOUT_BLOB = 100 * 1024;
export const MAX_UPLOAD_BYTES_WITH_BLOB = 10 * 1024 * 1024;

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
