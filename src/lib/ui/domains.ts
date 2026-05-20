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
    pillClass: "bg-blue-500/15 text-blue-700 dark:text-blue-200",
    tabActive: "border-blue-500 bg-gradient-to-l from-blue-600 via-blue-500 to-cyan-500",
    tabIdle:
      "border-blue-300/60 bg-blue-50 text-blue-800 hover:border-blue-400 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-200",
    shell: "border-blue-500/80 shadow-[0_14px_40px_rgba(37,99,235,0.28)]",
    header: "bg-gradient-to-l from-blue-600 via-blue-500 to-cyan-500",
    headerPill: "border border-white/35 bg-white/20 text-white",
    body: "bg-white dark:bg-[#10182b]",
    metaPanel: "border-2 border-blue-200 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950/50",
    metaIcon: "text-blue-600 dark:text-blue-300",
    footer: "border-t-2 border-blue-200 bg-blue-100/90 dark:border-blue-500/35 dark:bg-blue-950/60",
    dueChip: "border border-blue-300 bg-white text-blue-900 dark:border-blue-400/50 dark:bg-blue-900/60 dark:text-blue-100",
    accent: "bg-blue-600",
    legendDot: "bg-blue-500 ring-4 ring-blue-500/25",
    calendarChip:
      "border-blue-400/45 bg-gradient-to-l from-blue-500/25 to-cyan-400/20 text-blue-950 dark:text-blue-50",
    calendarDay: "from-blue-500/18 via-indigo-500/10 to-cyan-400/14",
    calendarAccent: "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.55)]",
  },
  positioning: {
    label: "מיצוב",
    pillClass: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-200",
    tabActive: "border-fuchsia-500 bg-gradient-to-l from-fuchsia-600 via-fuchsia-500 to-pink-500",
    tabIdle:
      "border-fuchsia-300/60 bg-fuchsia-50 text-fuchsia-800 hover:border-fuchsia-400 dark:border-fuchsia-500/40 dark:bg-fuchsia-950/40 dark:text-fuchsia-200",
    shell: "border-fuchsia-500/80 shadow-[0_14px_40px_rgba(192,38,211,0.28)]",
    header: "bg-gradient-to-l from-fuchsia-600 via-fuchsia-500 to-pink-500",
    headerPill: "border border-white/35 bg-white/20 text-white",
    body: "bg-white dark:bg-[#10182b]",
    metaPanel: "border-2 border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-500/40 dark:bg-fuchsia-950/50",
    metaIcon: "text-fuchsia-600 dark:text-fuchsia-300",
    footer: "border-t-2 border-fuchsia-200 bg-fuchsia-100/90 dark:border-fuchsia-500/35 dark:bg-fuchsia-950/60",
    dueChip: "border border-fuchsia-300 bg-white text-fuchsia-900 dark:border-fuchsia-400/50 dark:bg-fuchsia-900/60 dark:text-fuchsia-100",
    accent: "bg-fuchsia-600",
    legendDot: "bg-fuchsia-500 ring-4 ring-fuchsia-500/25",
    calendarChip:
      "border-fuchsia-400/45 bg-gradient-to-l from-fuchsia-500/25 to-pink-400/20 text-fuchsia-950 dark:text-fuchsia-50",
    calendarDay: "from-fuchsia-500/18 via-violet-500/10 to-pink-400/14",
    calendarAccent: "bg-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.55)]",
  },
  general: {
    label: "כללי",
    pillClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200",
    tabActive: "border-cyan-500 bg-gradient-to-l from-teal-600 via-cyan-500 to-emerald-500",
    tabIdle:
      "border-cyan-300/60 bg-cyan-50 text-cyan-800 hover:border-cyan-400 dark:border-cyan-500/40 dark:bg-cyan-950/40 dark:text-cyan-200",
    shell: "border-cyan-500/80 shadow-[0_14px_40px_rgba(6,182,212,0.28)]",
    header: "bg-gradient-to-l from-teal-600 via-cyan-500 to-emerald-500",
    headerPill: "border border-white/35 bg-white/20 text-white",
    body: "bg-white dark:bg-[#10182b]",
    metaPanel: "border-2 border-cyan-200 bg-cyan-50 dark:border-cyan-500/40 dark:bg-cyan-950/50",
    metaIcon: "text-cyan-700 dark:text-cyan-300",
    footer: "border-t-2 border-cyan-200 bg-cyan-100/90 dark:border-cyan-500/35 dark:bg-cyan-950/60",
    dueChip: "border border-cyan-300 bg-white text-cyan-900 dark:border-cyan-400/50 dark:bg-cyan-900/60 dark:text-cyan-100",
    accent: "bg-cyan-600",
    legendDot: "bg-cyan-500 ring-4 ring-cyan-500/25",
    calendarChip:
      "border-cyan-400/45 bg-gradient-to-l from-cyan-500/25 to-emerald-400/20 text-cyan-950 dark:text-cyan-50",
    calendarDay: "from-cyan-500/18 via-emerald-500/10 to-teal-400/14",
    calendarAccent: "bg-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.55)]",
  },
};

const neutralCardStyle: DomainCardStyle = {
  label: "ללא תחום",
  shell: "border-border-strong shadow-[0_12px_32px_rgba(15,23,42,0.12)]",
  header: "bg-gradient-to-l from-slate-600 to-slate-500",
  headerPill: "border border-white/35 bg-white/20 text-white",
  body: "bg-white dark:bg-[#10182b]",
  metaPanel: "border-2 border-border-weak bg-surface-2 dark:bg-surface-2/80",
  metaIcon: "text-text-muted",
  footer: "border-t-2 border-border-weak bg-surface-2",
  dueChip: "border border-border-weak bg-white text-text-secondary dark:bg-surface-1",
  accent: "bg-slate-500",
  legendDot: "bg-slate-400 ring-4 ring-slate-400/25",
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
