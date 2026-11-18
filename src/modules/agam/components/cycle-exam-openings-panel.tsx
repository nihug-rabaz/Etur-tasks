"use client";

import { useState } from "react";
import { CalendarClock, Lock, RotateCcw, ShieldCheck, Unlock } from "lucide-react";
import { toast } from "sonner";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { panelClass, panelPadClass } from "@/modules/agam/lib/ui";

export type CycleExamOpeningRow = {
  examId: string;
  title: string;
  questionCount: number;
  opensOn: string | null;
  source: "custom" | "prep_day" | null;
  prepDay: string | null;
  open: boolean;
};

function StatusBadge({ row }: { row: CycleExamOpeningRow }) {
  if (row.open) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-200">
        <Unlock size={11} />
        פתוח למועמדים
      </span>
    );
  }
  if (row.opensOn) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/12 px-2 py-0.5 text-[11px] font-extrabold text-violet-800 dark:text-violet-200">
        <CalendarClock size={11} />
        ייפתח ב־{formatAgamDate(row.opensOn)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-extrabold text-amber-800 dark:text-amber-200">
      <Lock size={11} />
      לא נקבע מועד
    </span>
  );
}

export function CycleExamOpeningsPanel({
  cycleId,
  rows,
  canEdit,
  onSaved,
}: {
  cycleId: string;
  rows: CycleExamOpeningRow[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);

  const save = async (examId: string, date: string | null) => {
    setSavingId(examId);
    try {
      await agamFetch(`/api/agam/cycles/${cycleId}`, {
        method: "PUT",
        body: JSON.stringify({ examOpenings: { [examId]: date } }),
      });
      toast.success(date ? "מועד הפתיחה עודכן" : "חזרה לברירת המחדל — יום מכין");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון נכשל");
    } finally {
      setSavingId(null);
    }
  };

  if (rows.length === 0) return null;
  const prepDay = rows[0]?.prepDay ?? null;

  return (
    <section className={`${panelClass} ${panelPadClass}`}>
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-700 dark:text-violet-300">
          <ShieldCheck size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-text-primary">פתיחת מבחנים רשמיים</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
            המבחנים נפתחים למועמדי המחזור בתאריך שנקבע כאן. ברירת המחדל היא יום המכין
            {prepDay ? ` (${formatAgamDate(prepDay)})` : " — שעדיין לא הוגדר למחזור"}. מבחני התרגול פתוחים תמיד.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {rows.map((row) => {
          const saving = savingId === row.examId;
          return (
            <li
              key={row.examId}
              className="flex flex-col gap-3 rounded-2xl bg-surface-2/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-text-primary">{row.title}</span>
                  <StatusBadge row={row} />
                </div>
                <p className="mt-1 text-[11px] font-semibold text-text-muted">
                  {row.questionCount} שאלות ·{" "}
                  {row.source === "custom"
                    ? "מועד שנקבע ידנית"
                    : row.source === "prep_day"
                      ? "ברירת מחדל: יום מכין"
                      : "יש לקבוע יום מכין או תאריך פתיחה"}
                </p>
              </div>

              {canEdit ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-44">
                    <TimelineDatePicker
                      label="תאריך פתיחה"
                      value={row.opensOn ?? ""}
                      onChange={(value) => {
                        if (!value) {
                          if (row.source === "custom") void save(row.examId, null);
                          return;
                        }
                        if (value !== row.opensOn) void save(row.examId, value);
                      }}
                    />
                  </div>
                  {row.source === "custom" ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void save(row.examId, null)}
                      className="inline-flex h-12 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-text-secondary transition hover:bg-surface-1 hover:text-text-primary disabled:opacity-50"
                      title="חזרה לתאריך יום המכין"
                    >
                      <RotateCcw size={13} />
                      ליום המכין
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
