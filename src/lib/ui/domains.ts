import { TaskWithRelations } from "@/types/models";

export type DomainKey = "recruitment" | "positioning" | "general";

export interface DomainCardStyle {
  label: string;
  shell: string;
  header: string;
  headerPill: string;
  body: string;
  metaPanel: string;
  metaIcon: string;
  footer: string;
  dueChip: string;
  accent: string;
  legendDot: string;
}

export const domainMeta: Record<
  DomainKey,
  DomainCardStyle & {
    pillClass: string;
    tabActive: string;
    tabIdle: string;
    calendarChip: string;
    calendarDay: string;
    calendarAccent: string;
  }
> = {
  recruitment: {
    label: "איתור",
    pillClass: "bg-sky-100 text-sky-700 dark:bg-sky-700/30 dark:text-sky-200",
    tabActive: "border-sky-300 bg-sky-500",
    tabIdle:
      "border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-300 dark:border-sky-500/30 dark:bg-sky-950/35 dark:text-sky-200",
    shell: "border-sky-200 shadow-sm",
    header: "bg-sky-500",
    headerPill: "border border-white/30 bg-white/20 text-white",
    body: "bg-white dark:bg-[#10182b]",
    metaPanel: "border border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-950/40",
    metaIcon: "text-sky-500 dark:text-sky-300",
    footer: "border-t border-sky-200 bg-sky-50 dark:border-sky-500/25 dark:bg-sky-950/45",
    dueChip: "border border-sky-200 bg-white text-sky-700 dark:border-sky-400/40 dark:bg-sky-900/50 dark:text-sky-100",
    accent: "bg-sky-400",
    legendDot: "bg-sky-400 ring-4 ring-sky-200/60",
    calendarChip:
      "border-sky-300/50 bg-sky-100 text-sky-800 dark:bg-sky-700/30 dark:text-sky-50",
    calendarDay: "bg-sky-100/40",
    calendarAccent: "bg-sky-400",
  },
  positioning: {
    label: "מיצוב",
    pillClass: "bg-rose-100 text-rose-700 dark:bg-rose-700/30 dark:text-rose-200",
    tabActive: "border-rose-300 bg-rose-400",
    tabIdle:
      "border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-300 dark:border-rose-500/30 dark:bg-rose-950/35 dark:text-rose-200",
    shell: "border-rose-200 shadow-sm",
    header: "bg-rose-400",
    headerPill: "border border-white/30 bg-white/20 text-white",
    body: "bg-white dark:bg-[#10182b]",
    metaPanel: "border border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-950/40",
    metaIcon: "text-rose-500 dark:text-rose-300",
    footer: "border-t border-rose-200 bg-rose-50 dark:border-rose-500/25 dark:bg-rose-950/45",
    dueChip: "border border-rose-200 bg-white text-rose-700 dark:border-rose-400/40 dark:bg-rose-900/50 dark:text-rose-100",
    accent: "bg-rose-400",
    legendDot: "bg-rose-400 ring-4 ring-rose-200/60",
    calendarChip:
      "border-rose-300/50 bg-rose-100 text-rose-800 dark:bg-rose-700/30 dark:text-rose-50",
    calendarDay: "bg-rose-100/40",
    calendarAccent: "bg-rose-400",
  },
  general: {
    label: "כללי",
    pillClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-700/30 dark:text-emerald-200",
    tabActive: "border-emerald-300 bg-emerald-500",
    tabIdle:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-950/35 dark:text-emerald-200",
    shell: "border-emerald-200 shadow-sm",
    header: "bg-emerald-500",
    headerPill: "border border-white/30 bg-white/20 text-white",
    body: "bg-white dark:bg-[#10182b]",
    metaPanel: "border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/40",
    metaIcon: "text-emerald-500 dark:text-emerald-300",
    footer: "border-t border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-950/45",
    dueChip: "border border-emerald-200 bg-white text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-900/50 dark:text-emerald-100",
    accent: "bg-emerald-400",
    legendDot: "bg-emerald-400 ring-4 ring-emerald-200/60",
    calendarChip:
      "border-emerald-300/50 bg-emerald-100 text-emerald-800 dark:bg-emerald-700/30 dark:text-emerald-50",
    calendarDay: "bg-emerald-100/40",
    calendarAccent: "bg-emerald-400",
  },
};

const neutralCardStyle: DomainCardStyle = {
  label: "ללא תחום",
  shell: "border-border-weak shadow-sm",
  header: "bg-slate-400",
  headerPill: "border border-white/30 bg-white/20 text-white",
  body: "bg-white dark:bg-[#10182b]",
  metaPanel: "border border-border-weak bg-surface-2 dark:bg-surface-2/80",
  metaIcon: "text-text-muted",
  footer: "border-t border-border-weak bg-surface-2",
  dueChip: "border border-border-weak bg-white text-text-secondary dark:bg-surface-1",
  accent: "bg-slate-400",
  legendDot: "bg-slate-400 ring-4 ring-slate-300/40",
};

export function domainCardStyle(domainName?: string | null): DomainCardStyle {
  const key = domainKeyFromName(domainName);
  if (!key) return neutralCardStyle;
  const meta = domainMeta[key];
  return {
    label: meta.label,
    shell: meta.shell,
    header: meta.header,
    headerPill: meta.headerPill,
    body: meta.body,
    metaPanel: meta.metaPanel,
    metaIcon: meta.metaIcon,
    footer: meta.footer,
    dueChip: meta.dueChip,
    accent: meta.accent,
    legendDot: meta.legendDot,
  };
}

export const domainKeys: DomainKey[] = ["recruitment", "positioning", "general"];

export function domainKeyFromName(domainName?: string | null): DomainKey | null {
  if (!domainName) return null;
  if (domainName === "Recruitment") return "recruitment";
  if (domainName === "Positioning") return "positioning";
  if (domainName === "General") return "general";
  return null;
}

export function groupTasksByDomain(tasks: TaskWithRelations[]): Record<DomainKey, TaskWithRelations[]> {
  const grouped: Record<DomainKey, TaskWithRelations[]> = {
    recruitment: [],
    positioning: [],
    general: [],
  };

  for (const task of tasks) {
    const key = domainKeyFromName(task.domain_name);
    if (!key) continue;
    grouped[key].push(task);
  }

  return grouped;
}
