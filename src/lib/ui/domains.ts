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
    accentHex: string;
    calendarChip: string;
    calendarDay: string;
    calendarAccent: string;
  }
> = {
  recruitment: {
    label: "איתור",
    accentHex: "#22b8cf",
    pillClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200",
    tabActive: "bg-cyan-500",
    tabIdle: "text-text-muted hover:text-cyan-600 dark:hover:text-cyan-300",
    shell: "shadow-sm",
    header: "bg-cyan-500",
    headerPill: "bg-white/20 text-white",
    body: "bg-surface-1",
    metaPanel: "bg-cyan-50 dark:bg-cyan-500/10",
    metaIcon: "text-cyan-500 dark:text-cyan-300",
    footer: "bg-cyan-50 dark:bg-cyan-500/10",
    dueChip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-100",
    accent: "bg-cyan-400",
    legendDot: "bg-cyan-400 ring-4 ring-cyan-200/60",
    calendarChip: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/25 dark:text-cyan-50",
    calendarDay: "bg-cyan-100/40",
    calendarAccent: "bg-cyan-400",
  },
  positioning: {
    label: "מיצוב",
    accentHex: "#fb923c",
    pillClass: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
    tabActive: "bg-orange-400",
    tabIdle: "text-text-muted hover:text-orange-600 dark:hover:text-orange-300",
    shell: "shadow-sm",
    header: "bg-orange-400",
    headerPill: "bg-white/20 text-white",
    body: "bg-surface-1",
    metaPanel: "bg-orange-50 dark:bg-orange-500/10",
    metaIcon: "text-orange-500 dark:text-orange-300",
    footer: "bg-orange-50 dark:bg-orange-500/10",
    dueChip: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-100",
    accent: "bg-orange-400",
    legendDot: "bg-orange-400 ring-4 ring-orange-200/60",
    calendarChip: "bg-orange-100 text-orange-800 dark:bg-orange-500/25 dark:text-orange-50",
    calendarDay: "bg-orange-100/40",
    calendarAccent: "bg-orange-400",
  },
  general: {
    label: "כללי",
    accentHex: "#8b5cf6",
    pillClass: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
    tabActive: "bg-violet-500",
    tabIdle: "text-text-muted hover:text-violet-600 dark:hover:text-violet-300",
    shell: "shadow-sm",
    header: "bg-violet-500",
    headerPill: "bg-white/20 text-white",
    body: "bg-surface-1",
    metaPanel: "bg-violet-50 dark:bg-violet-500/10",
    metaIcon: "text-violet-500 dark:text-violet-300",
    footer: "bg-violet-50 dark:bg-violet-500/10",
    dueChip: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-100",
    accent: "bg-violet-400",
    legendDot: "bg-violet-400 ring-4 ring-violet-200/60",
    calendarChip: "bg-violet-100 text-violet-800 dark:bg-violet-500/25 dark:text-violet-50",
    calendarDay: "bg-violet-100/40",
    calendarAccent: "bg-violet-400",
  },
};

const neutralCardStyle: DomainCardStyle = {
  label: "ללא תחום",
  shell: "shadow-sm",
  header: "bg-slate-400",
  headerPill: "bg-white/20 text-white",
  body: "bg-surface-1",
  metaPanel: "bg-surface-2",
  metaIcon: "text-text-muted",
  footer: "bg-surface-2",
  dueChip: "bg-surface-2 text-text-secondary",
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
