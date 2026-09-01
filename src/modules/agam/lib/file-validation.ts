import { ACCEPTED_FILE_TYPES } from "@/modules/agam/lib/document-types";

const ALLOWED_EXTENSIONS = new Set(
  ACCEPTED_FILE_TYPES.split(",")
    .map((item) => item.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean),
);

export function validateUploadFile(file: File): void {
  const name = file.name.trim();
  const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() : "";
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("INVALID_FILE_TYPE");
  }
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new Error("INVALID_FILE_NAME");
  }
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").trim() || "file";
}
