import { ClipboardCheck, Dumbbell, MessagesSquare, Sunrise, type LucideIcon } from "lucide-react";
import type {
  EvaluatorCycleSummary,
  EvaluatorEntryKind,
  EvaluatorEntryState,
} from "@/modules/agam/services/evaluator-portal.service";

export interface EvaluatorEntryMeta {
  kind: EvaluatorEntryKind;
  title: string;
  short: string;
  icon: LucideIcon;
  date: (cycle: EvaluatorCycleSummary) => string | null;
  /** Interview is one shared record per candidate; the rest are per evaluator. */
  shared: boolean;
}

export const EVALUATOR_ENTRIES: EvaluatorEntryMeta[] = [
  {
    kind: "interview",
    title: "ראיון",
    short: "ראיון",
    icon: MessagesSquare,
    date: (cycle) => cycle.selection_day,
    shared: true,
  },
  {
    kind: "evaluation",
    title: "הערכת יום מיונים",
    short: "מיונים",
    icon: ClipboardCheck,
    date: (cycle) => cycle.selection_day,
    shared: false,
  },
  {
    kind: "prep",
    title: "יום מכין",
    short: "מכין",
    icon: Sunrise,
    date: (cycle) => cycle.prep_day,
    shared: false,
  },
  {
    kind: "smach",
    title: "סמ״ח",
    short: "סמ״ח",
    icon: Dumbbell,
    date: (cycle) => cycle.smach_start,
    shared: false,
  },
];

export type EntryTone = "mine" | "others" | "empty";

export function entryTone(entry: EvaluatorEntryState): EntryTone {
  if (entry.mineId) return "mine";
  if (entry.done) return "others";
  return "empty";
}
