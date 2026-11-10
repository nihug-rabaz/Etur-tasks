const IL_TZ = "Asia/Jerusalem";

type JerusalemParts = { y: number; m: number; d: number; dow: number };

/** Calendar Y-M-D + weekday in Asia/Jerusalem (dow: 0=Sun … 6=Sat). */
function jerusalemParts(date: Date): JerusalemParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: IL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const weekday = get("weekday");
  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    dow: dowMap[weekday] ?? 0,
  };
}

/** Stable Date representing a Jerusalem calendar day (for formatting). */
function jerusalemDay(y: number, m: number, d: number): Date {
  // UTC 10:00 keeps the civil day stable for Asia/Jerusalem year-round.
  return new Date(Date.UTC(y, m - 1, d, 10, 0, 0));
}

/** Add N Israeli business days (Sun–Thu in Asia/Jerusalem). Skips Fri–Sat. No holidays. */
export function addBusinessDays(from: Date, days: number): Date {
  const start = jerusalemParts(from);
  let cursor = jerusalemDay(start.y, start.m, start.d);
  let remaining = Math.max(0, Math.floor(days));
  while (remaining > 0) {
    const p = jerusalemParts(cursor);
    cursor = jerusalemDay(p.y, p.m, p.d + 1); // Date.UTC overflows months
    const next = jerusalemParts(cursor);
    cursor = jerusalemDay(next.y, next.m, next.d);
    if (next.dow !== 5 && next.dow !== 6) {
      remaining -= 1;
    }
  }
  return cursor;
}

/** YYYY-MM-DD in Asia/Jerusalem. */
export function toIsoDateLocal(date: Date): string {
  const p = jerusalemParts(date);
  return `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function formatHebrewDate(date: Date): string {
  return date.toLocaleDateString("he-IL", {
    timeZone: IL_TZ,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const DEV_FEEDBACK_SLA_BUSINESS_DAYS = 4;

export function previewSlaDueDate(from: Date = new Date()): {
  date: Date;
  iso: string;
  label: string;
} {
  const date = addBusinessDays(from, DEV_FEEDBACK_SLA_BUSINESS_DAYS);
  return {
    date,
    iso: toIsoDateLocal(date),
    label: formatHebrewDate(date),
  };
}
