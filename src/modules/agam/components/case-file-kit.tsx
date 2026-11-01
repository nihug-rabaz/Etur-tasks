"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

export type CaseTone = "sky" | "emerald" | "amber" | "rose" | "slate" | "violet";

const TONE_HEAD: Record<CaseTone, string> = {
  sky: "bg-sky-50 dark:bg-sky-500/10",
  emerald: "bg-emerald-50 dark:bg-emerald-500/10",
  amber: "bg-amber-50 dark:bg-amber-500/10",
  rose: "bg-rose-50 dark:bg-rose-500/10",
  slate: "bg-slate-100 dark:bg-white/[0.05]",
  violet: "bg-violet-50 dark:bg-violet-500/10",
};

const TONE_ICON: Record<CaseTone, string> = {
  sky: "text-sky-700 dark:text-sky-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  amber: "text-amber-700 dark:text-amber-300",
  rose: "text-rose-700 dark:text-rose-300",
  slate: "text-slate-600 dark:text-slate-300",
  violet: "text-violet-700 dark:text-violet-300",
};

type IconType = ComponentType<{ size?: number; className?: string }>;

/** White card with soft shadow — the base surface of every block in the file. */
export const caseCardClass =
  "overflow-hidden rounded-3xl bg-surface-1 shadow-[0_0_0_1px_rgba(22,24,29,0.05),0_8px_28px_-14px_rgba(22,24,29,0.18)] dark:bg-[#181a22] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]";

export function CaseSectionHead({
  icon: Icon,
  title,
  tone = "slate",
  action,
  centered = false,
  open,
  onToggle,
}: {
  icon: IconType;
  title: string;
  tone?: CaseTone;
  action?: ReactNode;
  centered?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const collapsible = Boolean(onToggle);
  return (
    <header
      className={`flex items-center gap-2 px-4 py-2.5 ${
        !collapsible || open
          ? "shadow-[inset_0_-1px_0_rgba(22,24,29,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]"
          : ""
      } ${TONE_HEAD[tone]} ${centered ? "justify-center" : "justify-between"} ${
        collapsible ? "cursor-pointer select-none" : ""
      }`}
      onClick={onToggle}
      role={collapsible ? "button" : undefined}
      aria-expanded={collapsible ? open : undefined}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon size={17} className={`shrink-0 ${TONE_ICON[tone]}`} />
        <h3 className="truncate text-[15px] font-extrabold text-text-primary">{title}</h3>
      </span>
      {action || collapsible ? (
        <span className="flex shrink-0 items-center gap-1">
          {action ? (
            <span className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
              {action}
            </span>
          ) : null}
          {collapsible ? (
            <ChevronDown
              size={17}
              className={`text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          ) : null}
        </span>
      ) : null}
    </header>
  );
}

/** One label/value line with a hairline under it, like a <dl> row in a paper file. */
export function CaseRow({
  label,
  value,
  emphasis = false,
  wide = false,
  children,
}: {
  label: string;
  value?: ReactNode;
  emphasis?: boolean;
  wide?: boolean;
  children?: ReactNode;
}) {
  const empty = value == null || value === "" || value === "—";
  return (
    <div
      className={`flex gap-x-3 gap-y-1 py-2 shadow-[inset_0_-1px_0_rgba(22,24,29,0.05)] last:shadow-none dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)] ${
        wide ? "flex-col" : "flex-wrap items-baseline justify-between"
      }`}
    >
      <dt className="shrink-0 text-[13px] font-semibold text-text-muted">{label}</dt>
      {children ?? (
        <dd
          className={`min-w-0 text-[14px] font-bold ${
            empty ? "text-text-muted/60" : emphasis ? "text-accent-primary" : "text-text-primary"
          } ${wide ? "whitespace-pre-wrap leading-relaxed" : "text-start"}`}
        >
          {empty ? "—" : value}
        </dd>
      )}
    </div>
  );
}

export function CaseRows({ children }: { children: ReactNode }) {
  return <dl className="px-4 py-1.5">{children}</dl>;
}

/** Round white icon button used in the hero action pill. */
export function HeroAction({
  icon: Icon,
  label,
  href,
  onClick,
  tone = "default",
}: {
  icon: IconType;
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
}) {
  const className = `inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-1 text-text-muted shadow-[0_1px_3px_rgba(22,24,29,0.12)] transition hover:-translate-y-px ${
    tone === "danger"
      ? "hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
      : "hover:bg-accent-primary/10 hover:text-accent-primary"
  }`;
  if (href) {
    return (
      <Link href={href} className={className} title={label} aria-label={label}>
        <Icon size={17} />
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} title={label} aria-label={label}>
      <Icon size={17} />
    </button>
  );
}

/** Segmented pill tabs with a dark active pill (giur-tabs). */
export function CasePillTabs({
  items,
}: {
  items: Array<{ key: string; label: string; href: string; active: boolean; count?: number }>;
}) {
  return (
    <nav className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full bg-surface-2 p-1 shadow-[inset_0_0_0_1px_rgba(42,53,68,0.06)]">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition ${
            item.active
              ? "bg-text-primary text-white shadow-[0_4px_12px_-4px_rgba(22,24,29,0.45)] dark:bg-white dark:text-black"
              : "text-text-secondary hover:bg-surface-1 hover:text-text-primary"
          }`}
        >
          {item.label}
          {item.count != null && item.count > 0 ? (
            <span
              className={`rounded-full px-1.5 text-[10px] font-extrabold tabular-nums ${
                item.active ? "bg-white/20 text-white dark:bg-black/15 dark:text-black" : "bg-surface-1 text-text-muted"
              }`}
            >
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/** Side-column key/value stat line ("נתוני התהליך"). */
export function SideStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-extrabold tabular-nums text-text-primary">{value}</span>
    </div>
  );
}
