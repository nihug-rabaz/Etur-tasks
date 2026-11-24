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
  /** Tailwind classes for the tinted icon tile. */
  tile: string;
  /** Solid dot / ring accent. */
  dot: string;
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
    tile: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    date: (cycle) => cycle.selection_day,
    shared: true,
  },
  {
    kind: "evaluation",
    title: "הערכת יום מיונים",
    short: "מיונים",
    icon: ClipboardCheck,
    tile: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    date: (cycle) => cycle.selection_day,
    shared: false,
  },
  {
    kind: "prep",
    title: "יום מכין",
    short: "מכין",
    icon: Sunrise,
    tile: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    date: (cycle) => cycle.prep_day,
    shared: false,
  },
  {
    kind: "smach",
    title: "סמ״ח",
    short: "סמ״ח",
    icon: Dumbbell,
    tile: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
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

const AVATAR_TONES = [
  "from-violet-500 to-indigo-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-fuchsia-500 to-purple-500",
];

export function avatarTone(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")) || "?";
}
