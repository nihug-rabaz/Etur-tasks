/** Fixed recruitment months for every cohort year, in calendar order. */
export const YEARBOOK_MONTHS = [
  { month: 2, name: "פברואר" },
  { month: 5, name: "מאי" },
  { month: 8, name: "אוגוסט" },
  { month: 11, name: "נובמבר" },
] as const;

export type YearbookMonth = (typeof YEARBOOK_MONTHS)[number];

export function yearbookCycleDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function cycleMonthNumber(cycleDate: string | null | undefined): number | null {
  if (!cycleDate) return null;
  const match = String(cycleDate).match(/^\d{4}-(\d{2})/);
  if (!match) return null;
  const month = Number(match[1]);
  return Number.isFinite(month) ? month : null;
}

export function yearbookMonthForDate(cycleDate: string | null | undefined): YearbookMonth | null {
  const month = cycleMonthNumber(cycleDate);
  if (month == null) return null;
  return YEARBOOK_MONTHS.find((row) => row.month === month) ?? null;
}

/** Tab title: fixed month name when the cycle falls on Feb/May/Aug/Nov. */
export function yearbookTabLabel(name: string, cycleDate: string | null | undefined): string {
  return yearbookMonthForDate(cycleDate)?.name ?? name;
}
