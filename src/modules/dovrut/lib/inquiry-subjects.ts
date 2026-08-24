import type { DovrutInquirySubject } from "@/modules/dovrut/types";

export const DOVRUT_RANKS = [
  "טוראי",
  "רב״ט",
  "סמל",
  "סמ״ר",
  "רס״ל",
  "רס״ר",
  "רס״מ",
  "רס״ב",
  "סגן משנה",
  "סגן",
  "סרן",
  "רס״ן",
  "סא״ל",
  "אל״מ",
  "תא״ל",
  "אחר",
] as const;

export type DovrutRank = (typeof DOVRUT_RANKS)[number];

export const DOVRUT_ROLE_PRESETS = [
  "רמ״ט",
  "רמ״ח",
  "רבצ״ר",
  "רע״ן הלכה",
  "רע״ן כשרות",
  "קצין דוברות",
  "חפשן",
] as const;

export function ageFromBirthDate(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const birth = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export function yearsFromRoleStart(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const start = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  if (start > now) return 0;
  const years = (now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.round(years * 10) / 10;
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function buildInquiryParagraph(subject: DovrutInquirySubject): string {
  const age = subject.birth_date
    ? ageFromBirthDate(toDateInputValue(subject.birth_date))
    : subject.age;
  const years = subject.role_started_at
    ? yearsFromRoleStart(toDateInputValue(subject.role_started_at))
    : subject.years_in_role;

  const parts: string[] = [];
  const head = [subject.rank, subject.name].filter(Boolean).join(" ");
  if (head) parts.push(head);
  if (subject.role_title) parts.push(`מכהן בתפקיד ${subject.role_title}`);
  if (age != null) parts.push(`בן ${age}`);
  if (subject.hometown) parts.push(`מתגורר ב${subject.hometown}`);
  if (subject.family_status) parts.push(`מצב משפחתי: ${subject.family_status}`);
  if (subject.enlistment_year) parts.push(`גויס ב־${subject.enlistment_year}`);
  if (years != null) parts.push(`בתפקיד כ־${years} שנים`);
  if (subject.previous_roles) parts.push(`תפקידים קודמים: ${subject.previous_roles}`);
  if (subject.bio?.trim()) parts.push(subject.bio.trim());

  return parts.join(". ").replace(/\.\s*\./g, ".") + (parts.length ? "." : "");
}

export function buildInquiryCopyText(subject: DovrutInquirySubject): string {
  const age = subject.birth_date
    ? ageFromBirthDate(toDateInputValue(subject.birth_date))
    : subject.age;
  const years = subject.role_started_at
    ? yearsFromRoleStart(toDateInputValue(subject.role_started_at))
    : subject.years_in_role;

  return [
    subject.role_title ? `תפקיד: ${subject.role_title}` : null,
    `שם: ${subject.name}`,
    subject.rank ? `דרגה: ${subject.rank}` : null,
    age != null ? `גיל: ${age}` : null,
    subject.hometown ? `עיר מגורים: ${subject.hometown}` : null,
    subject.family_status ? `מצב משפחתי: ${subject.family_status}` : null,
    subject.enlistment_year ? `שנת גיוס: ${subject.enlistment_year}` : null,
    years != null ? `שנים בתפקיד: ${years}` : null,
    subject.previous_roles ? `תפקידים קודמים: ${subject.previous_roles}` : null,
    subject.bio?.trim() ? `ביוגרפיה:\n${subject.bio.trim()}` : null,
    subject.notes?.trim() ? `הערות: ${subject.notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
