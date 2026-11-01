"use client";

import { Check, X } from "lucide-react";

export function PassFailPicker({
  value,
  onChange,
  label = "החלטה",
}: {
  value: boolean | null;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold text-text-muted">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-extrabold transition ${
            value === true
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-surface-2 text-text-primary hover:bg-emerald-500/15"
          }`}
        >
          <Check size={16} strokeWidth={2.5} />
          עבר
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-extrabold transition ${
            value === false
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-surface-2 text-text-primary hover:bg-rose-500/15"
          }`}
        >
          <X size={16} strokeWidth={2.5} />
          לא עבר
        </button>
      </div>
    </div>
  );
}

export function PassFailBadge({ value }: { value: boolean | null | undefined }) {
  if (value == null) return null;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
        value
          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
          : "bg-rose-500/15 text-rose-800 dark:text-rose-200"
      }`}
    >
      {value ? "עבר" : "לא עבר"}
    </span>
  );
}
