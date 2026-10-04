function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Normalize DB/API date values (string | Date) into YYYY-MM-DD for <input type="date">. */
export function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const text = String(value).trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatAgamDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  const date = value instanceof Date ? value : new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return [
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(" ");
}

export function formatAgamDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
  }
  const text = String(value);
  const normalized = text.includes("T") ? text : `${text}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return text;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
