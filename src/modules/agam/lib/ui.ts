/** Main containers — same glass + soft shadow as the tasks dashboard */
export const panelClass = "dashboard-glass rounded-3xl";

/** Nested cards — hairline + fill, like project cards on the tasks board */
export const cardClass = "ui-card rounded-2xl bg-surface-2 p-4";

/** Compact inner row / stat block */
export const innerCardClass = "ui-card rounded-xl bg-surface-2 p-3";

/** Inputs — white fill + inset outline so fields read clearly on grey cards */
export const fieldClass =
  "ui-field w-full rounded-2xl bg-surface-1 px-3 py-2.5 text-sm font-semibold text-text-primary outline-none transition placeholder:text-text-muted";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_-10px_rgba(139,92,246,0.9)] transition hover:brightness-105 disabled:opacity-50";

export const secondaryButtonClass =
  "ui-card inline-flex items-center justify-center gap-2 rounded-xl bg-surface-1 px-4 py-2.5 text-sm font-bold text-text-primary transition hover:bg-surface-2 disabled:opacity-50";

export const chipClass =
  "ui-card inline-flex items-center gap-1.5 rounded-lg bg-surface-1 px-2.5 py-1.5 text-xs font-bold text-text-primary transition hover:bg-accent-primary/12 hover:text-accent-primary";

export const dangerChipClass =
  "ui-card inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-500/18 dark:text-rose-200";

export const iconChipClass =
  "ui-card inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-1 text-text-secondary transition hover:bg-accent-primary/12 hover:text-accent-primary";

export const dangerIconChipClass =
  "ui-card inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-700 transition hover:bg-rose-500/18";

/** Hairline row/section divider (CSS borders are globally transparent) */
export const dividerClass = "ui-divider";
export const dividerTopClass = "ui-divider-top";
