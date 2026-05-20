"use client";

import { useEffect, useMemo, useState } from "react";

interface PermissionSubtopic {
  id: string;
  name: string;
}

interface PermissionGroup {
  domainSlug: string;
  domainLabel: string;
  items: PermissionSubtopic[];
}

interface UserPermissionsEditorProps {
  userId: string;
  isApproved: boolean;
  groups: PermissionGroup[];
  selectedIds: string[];
  syncAction: (formData: FormData) => Promise<void>;
  variant?: "default" | "monday";
}

export function UserPermissionsEditor({
  userId,
  isApproved,
  groups,
  selectedIds,
  syncAction,
  variant = "default",
}: UserPermissionsEditorProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [open, setOpen] = useState(false);
  const allIds = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => item.id)),
    [groups],
  );

  useEffect(() => {
    setSelected(selectedIds);
  }, [selectedIds]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSelected(allIds);
  };

  const clearAll = () => {
    setSelected([]);
  };

  const formInner = (
    <form action={syncAction}>
      <input type="hidden" name="userId" value={userId} />
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={selectAll}
          disabled={!isApproved}
          className="rounded-md border border-[#c5c7d0] bg-white px-3 py-1.5 text-xs font-semibold text-[#323338] transition hover:bg-[#f6f7fb] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          הענק הכל
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={!isApproved}
          className="rounded-md border border-[#c5c7d0] bg-white px-3 py-1.5 text-xs font-semibold text-[#676879] transition hover:bg-[#f6f7fb] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          בטל הכל
        </button>
      </div>
      <div
        className={
          variant === "monday"
            ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            : "grid grid-cols-3 gap-3"
        }
      >
        {groups.map((group) => (
          <div
            key={group.domainSlug}
            className={
              variant === "monday"
                ? "rounded-lg border border-[#e6e9ef] bg-white p-3 dark:border-slate-600 dark:bg-slate-800/80"
                : "rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
            }
          >
            <p
              className={
                variant === "monday"
                  ? "mb-2 text-xs font-bold uppercase tracking-wide text-[#676879] dark:text-slate-400"
                  : "mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400"
              }
            >
              {group.domainLabel}
            </p>
            <div className="space-y-1.5">
              {group.items.map((subtopic) => {
                const checked = selected.includes(subtopic.id);
                return (
                  <label
                    key={subtopic.id}
                    className={
                      variant === "monday"
                        ? "flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-[#323338] transition hover:bg-[#f6f7fb] has-[:disabled]:cursor-not-allowed dark:text-slate-200 dark:hover:bg-slate-700/50"
                        : "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    }
                  >
                    <input
                      type="checkbox"
                      name="subtopicIds"
                      value={subtopic.id}
                      checked={checked}
                      onChange={() => toggle(subtopic.id)}
                      disabled={!isApproved}
                      className="h-4 w-4 rounded border-[#c5c7d0] text-[#0073ea] focus:ring-[#0073ea]/30"
                    />
                    <span className={variant === "monday" ? "" : "text-slate-700 dark:text-slate-200"}>
                      {subtopic.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        disabled={!isApproved}
        className={
          variant === "monday"
            ? "mt-4 rounded-md bg-[#0073ea] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0060c3] disabled:opacity-50"
            : "mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        }
      >
        שמירת הרשאות
      </button>
    </form>
  );

  if (variant === "monday") {
    return (
      <div className="rounded-lg border border-[#e6e9ef] bg-white p-4 dark:border-slate-600 dark:bg-slate-800/40">
        <h3 className="mb-1 text-sm font-semibold text-[#323338] dark:text-slate-100">הרשאות תתי-נושא</h3>
        <p className="mb-4 text-xs text-[#676879] dark:text-slate-400">
          סמן תחומים שהמשתמש רשאי לראות. נדרש משתמש מאושר.
        </p>
        {formInner}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border-weak bg-surface-2/45 p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-100"
      >
        <span>הרשאות תתי-נושא</span>
        <span>{open ? "▼" : "◀"}</span>
      </button>
      {open ? <div className="mt-3">{formInner}</div> : null}
    </div>
  );
}
