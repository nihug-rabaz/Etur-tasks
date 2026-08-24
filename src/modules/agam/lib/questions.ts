import type { AgamConditionOperator, AgamFieldType, AgamQuestion } from "@/modules/agam/types";
import { evalCondition } from "@/modules/agam/lib/document-types";

export const FIELD_TYPES: Array<{ value: AgamFieldType; label: string }> = [
  { value: "text", label: "טקסט" },
  { value: "number", label: "מספר" },
  { value: "select", label: "בחירה" },
  { value: "textarea", label: "פסקה" },
];

export const CONDITION_OPERATORS: Array<{ value: AgamConditionOperator; label: string }> = [
  { value: "eq", label: "שווה" },
  { value: "neq", label: "שונה" },
  { value: "gt", label: "גדול מ" },
  { value: "lt", label: "קטן מ" },
  { value: "gte", label: "גדול או שווה" },
  { value: "lte", label: "קטן או שווה" },
];

export function parseQuestionOptions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export function isQuestionVisible(question: AgamQuestion, values: Record<string, string>): boolean {
  if (!question.condition_field) return true;
  return evalCondition(question.condition_operator, values[question.condition_field], question.condition_value);
}

export function groupQuestionsBySection(questions: AgamQuestion[]) {
  const map = new Map<number, { name: string; items: AgamQuestion[] }>();
  for (const question of questions) {
    if (!map.has(question.section_number)) {
      map.set(question.section_number, {
        name: question.section_name ?? `מקטע ${question.section_number}`,
        items: [],
      });
    }
    map.get(question.section_number)!.items.push(question);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}
