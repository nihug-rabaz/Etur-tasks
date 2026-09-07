export const BAHAD1_CHECKLIST = [
  "אישור רפואי בתוקף",
  "אישור למבדק",
  "סכמר למי שנדרש",
  "חווד 870",
  "מסמכי זימון והתחייבויות",
  "ציוד אישי לפי הנחיות בה״ד 1",
] as const;

export type Bahad1ChecklistItem = (typeof BAHAD1_CHECKLIST)[number];
