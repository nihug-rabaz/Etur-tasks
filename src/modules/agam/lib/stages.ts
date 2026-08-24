import type { AgamStageKey } from "@/modules/agam/types";

export const AGAM_STAGES: Array<{
  key: AgamStageKey;
  name: string;
  description: string;
  ramadOnly?: boolean;
}> = [
  { key: "day_selection", name: "יום המיונים", description: "ראיונות והערכת קריטריונים" },
  { key: "preparation_day", name: "היום המכין", description: "ציוני מקרא, שיחה ודינמיקה" },
  { key: "smach", name: "סמ״ח", description: "מבחני סף והערכה מקצועית" },
  { key: "documents", name: "מסמכים", description: "העלאה וניהול קבצים" },
  { key: "final_decision", name: "החלטה סופית", description: "עבר / לא עבר ודוח PDF", ramadOnly: true },
];

export const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  passed: "עבר",
  not_passed: "לא עבר",
};

export const STATUS_TONES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-800 dark:text-amber-100",
  passed: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-100",
  not_passed: "bg-rose-500/15 text-rose-800 dark:text-rose-100",
};

export const THRESHOLD_TESTS = [
  { key: "mikra", label: "מקראות ישראל", datum: "ציון" },
  { key: "weapon", label: "בוחן נשק", datum: "ציון" },
  { key: "run", label: "כושר ריצה", datum: "זמן" },
  { key: "strength", label: "כושר כוח", datum: "חזרות" },
];

export const PROFESSIONAL_DIMENSIONS = [
  "מנהיגות",
  "ידע הלכתי",
  "תקשורת",
  "יוזמה",
  "עבודת צוות",
  "התמודדות עם לחץ",
  "דוגמה אישית",
];

export const RECOMMENDATIONS = ["ממליץ", "ממליץ בהסתייגות", "לא ממליץ"] as const;

export const SMACH_DECISIONS = ["מומלץ", "מומלץ בהסתייגות", "לא מומלץ"] as const;

export const STAGE_VIEWS: Array<{ key: AgamStageKey; label: string; columnHeader: string }> = [
  { key: "day_selection", label: "יום מיונים", columnHeader: "סיכום מיונים" },
  { key: "preparation_day", label: "היום המכין", columnHeader: "סיכום מכין" },
  { key: "smach", label: "סמ״ח", columnHeader: "סיכום סמ״ח" },
  { key: "documents", label: "מסמכים", columnHeader: "מסמכים" },
  { key: "final_decision", label: "החלטה", columnHeader: "החלטה" },
];
