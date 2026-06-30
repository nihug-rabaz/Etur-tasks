"use client";

import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

interface SubtopicOption {
  id: string;
  name: string;
}

interface SubtopicMultiSelectProps {
  options: SubtopicOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function SubtopicMultiSelect({ options, value, onChange, disabled = false }: SubtopicMultiSelectProps) {
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(options.map((item) => item.id));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled || options.length === 0}
          className="rounded-lg border border-border-weak bg-surface-2 px-2.5 py-1 text-xs font-semibold text-text-secondary transition hover:border-accent-primary/40 disabled:opacity-50"
        >
          בחר הכל
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={disabled || value.length === 0}
          className="rounded-lg border border-border-weak bg-surface-2 px-2.5 py-1 text-xs font-semibold text-text-secondary transition hover:border-accent-primary/40 disabled:opacity-50"
        >
          נקה
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((item) => {
          const checked = value.includes(item.id);
          return (
            <label
              key={item.id}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                checked
                  ? "border-accent-primary/50 bg-accent-primary/10 text-text-primary"
                  : "border-border-weak bg-surface-2/40 text-text-secondary hover:border-accent-primary/30"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(item.id)}
                className="h-4 w-4 accent-accent-primary"
              />
              <span>{toHebrewSubtopicLabel(item.name)}</span>
            </label>
          );
        })}
      </div>
      {value.length > 1 ? (
        <p className="text-xs text-text-muted">הפריט יוצג בכל תתי-הנושא שנבחרו.</p>
      ) : null}
    </div>
  );
}
