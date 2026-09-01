export const ASSESSMENT_CATEGORY_LABELS: Record<string, string> = {
  interview: "ראיונות",
  day_selection: "יום מיונים",
  preparation_day: "היום המכין",
  smach: "סמ״ח",
  other: "אחר",
};

export const ASSESSMENT_CATEGORIES = [
  { value: "interview", label: ASSESSMENT_CATEGORY_LABELS.interview },
  { value: "day_selection", label: ASSESSMENT_CATEGORY_LABELS.day_selection },
  { value: "preparation_day", label: ASSESSMENT_CATEGORY_LABELS.preparation_day },
  { value: "smach", label: ASSESSMENT_CATEGORY_LABELS.smach },
  { value: "other", label: ASSESSMENT_CATEGORY_LABELS.other },
] as const;

export function assessmentCategoryLabel(category: string): string {
  return ASSESSMENT_CATEGORY_LABELS[category] ?? ASSESSMENT_CATEGORY_LABELS.other;
}
