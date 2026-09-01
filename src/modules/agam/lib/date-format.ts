function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatAgamDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const text = String(value);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return [
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(" ");
}

export function formatAgamDate(value: string | null | undefined): string {
  if (!value) return "";
  const text = String(value);
  const normalized = text.includes("T") ? text : `${text}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
