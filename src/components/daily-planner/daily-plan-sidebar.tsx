"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type DragEvent } from "react";
import {
  DAILY_PLAN_CHANGED_EVENT,
  DailyPlannerClient,
  type DailyPlannerSlot,
} from "@/lib/daily-planner/daily-planner-client";
import { useOptionalTaskDragDrop } from "@/components/main-tabs/task-drag-drop-context";

const priorityTone: Record<DailyPlannerSlot["priority"], string> = {
  high: "border-rose-400/60 bg-rose-500/15 text-rose-950 dark:border-rose-400/50 dark:bg-rose-500/25 dark:text-rose-50",
  medium:
    "border-amber-400/60 bg-amber-500/15 text-amber-950 dark:border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-50",
  low: "border-emerald-400/60 bg-emerald-500/15 text-emerald-950 dark:border-emerald-400/50 dark:bg-emerald-500/25 dark:text-emerald-50",
};

const priorityLabel: Record<DailyPlannerSlot["priority"], string> = {
  high: "דחוף",
  medium: "בינוני",
  low: "לא דחוף",
};

const priorityRank: Record<DailyPlannerSlot["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

class DailyPlanListSorter {
  public static byUrgency(slots: DailyPlannerSlot[]): DailyPlannerSlot[] {
    return [...slots].sort((left, right) => {
      const rankDiff = priorityRank[left.priority] - priorityRank[right.priority];
      if (rankDiff !== 0) return rankDiff;
      return left.title.localeCompare(right.title, "he");
    });
  }
}

export function DailyPlanSidebar({
  accentHex = "#22b8cf",
  allowDrop = true,
  emptyHint,
}: {
  accentHex?: string;
  allowDrop?: boolean;
  emptyHint?: string;
}) {
  const dragDrop = useOptionalTaskDragDrop();
  const [planDate] = useState(() => DailyPlannerClient.dateKey(new Date()));
  const [slots, setSlots] = useState<DailyPlannerSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const panelStyle = useMemo(
    () =>
      ({
        borderColor: isOver ? accentHex : isDark ? `${accentHex}70` : `${accentHex}66`,
        background: isDark
          ? `color-mix(in srgb, ${accentHex} ${isOver ? 28 : 20}%, #181a22)`
          : `color-mix(in srgb, ${accentHex} ${isOver ? 24 : 18}%, var(--surface-1))`,
        boxShadow: isOver
          ? `0 0 0 4px ${accentHex}45, 0 18px 40px -24px ${accentHex}aa`
          : isDark
            ? `0 18px 40px -24px rgba(0,0,0,0.65)`
            : `0 18px 40px -24px ${accentHex}88`,
        fontFamily: "var(--font-plan-hand), var(--font-secular), var(--font-heebo), cursive",
        color: isDark ? "#f3f4f6" : undefined,
      }) as CSSProperties,
    [accentHex, isDark, isOver],
  );

  const load = useCallback(async (force = false, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError("");
    try {
      const snapshot = await DailyPlannerClient.load(planDate, force);
      const sorted = DailyPlanListSorter.byUrgency(
        snapshot.slots.map((slot) => ({
          ...slot,
          is_done: Boolean(slot.is_done),
        })),
      );
      setSlots(sorted);
      DailyPlannerClient.updateSlots(planDate, sorted);
    } catch {
      setError("לא ניתן לטעון את הלו״ז");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [planDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ planDate?: string }>).detail;
      if (detail?.planDate && detail.planDate !== planDate) return;
      void load(true, { silent: true });
    };
    window.addEventListener(DAILY_PLAN_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DAILY_PLAN_CHANGED_EVENT, onChanged);
  }, [load, planDate]);

  const isDragging = Boolean(dragDrop?.dragTask);

  const addTask = useCallback(
    async (
      taskId: string,
      meta?: {
        title?: string;
        priority?: DailyPlannerSlot["priority"];
        status?: DailyPlannerSlot["status"];
      },
    ) => {
      if (slots.some((slot) => slot.task_id === taskId)) return;
      setBusyTaskId(taskId);
      setError("");
      const optimistic: DailyPlannerSlot = {
        start_minute: 0,
        duration_minutes: 30,
        task_id: taskId,
        title: meta?.title || "משימה",
        priority: meta?.priority || "medium",
        status: meta?.status || "in_progress",
        is_done: false,
      };
      setSlots((current) => DailyPlanListSorter.byUrgency([...current, optimistic]));
      try {
        const result = await DailyPlannerClient.addToDayList(planDate, taskId);
        setSlots((current) =>
          DailyPlanListSorter.byUrgency(
            current.map((slot) =>
              slot.task_id === taskId
                ? {
                    ...slot,
                    start_minute: result.startMinute,
                    duration_minutes: result.durationMinutes,
                  }
                : slot,
            ),
          ),
        );
        await load(true);
      } catch {
        setSlots((current) => current.filter((slot) => slot.task_id !== taskId));
        setError("הוספה ללו״ז נכשלה");
      } finally {
        setBusyTaskId(null);
        setIsOver(false);
        setDragDepth(0);
      }
    },
    [load, planDate, slots],
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      setBusyTaskId(taskId);
      setError("");
      const previous = slots;
      setSlots((current) => current.filter((slot) => slot.task_id !== taskId));
      try {
        await DailyPlannerClient.removeFromDayList(planDate, taskId);
        DailyPlannerClient.updateSlots(
          planDate,
          previous.filter((slot) => slot.task_id !== taskId),
        );
      } catch {
        setSlots(previous);
        setError("הסרה מהלו״ז נכשלה");
      } finally {
        setBusyTaskId(null);
      }
    },
    [planDate, slots],
  );

  const toggleDone = useCallback(
    async (taskId: string, isDone: boolean) => {
      setError("");
      setSlots((current) =>
        current.map((slot) => (slot.task_id === taskId ? { ...slot, is_done: isDone } : slot)),
      );
      try {
        await DailyPlannerClient.setDone(planDate, taskId, isDone);
      } catch {
        setSlots((current) =>
          current.map((slot) =>
            slot.task_id === taskId ? { ...slot, is_done: !isDone } : slot,
          ),
        );
        setError("עדכון סימון נכשל");
      }
    },
    [planDate],
  );

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!allowDrop) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (isDragging || event.dataTransfer.types.includes("text/plain")) {
      setIsOver(true);
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!allowDrop) return;
    event.preventDefault();
    event.stopPropagation();
    setDragDepth((depth) => depth + 1);
    setIsOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!allowDrop) return;
    event.preventDefault();
    event.stopPropagation();
    setDragDepth((depth) => {
      const next = Math.max(0, depth - 1);
      if (next === 0) setIsOver(false);
      return next;
    });
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!allowDrop) return;
    event.preventDefault();
    event.stopPropagation();
    setIsOver(false);
    setDragDepth(0);
    const fromContext = dragDrop?.dragTask;
    const taskId = fromContext?.id || event.dataTransfer.getData("text/plain");
    if (!taskId) return;
    void addTask(taskId, {
      title: fromContext?.title,
      priority: fromContext?.priority,
      status: fromContext?.status,
    });
    dragDrop?.endDrag();
  };

  return (
    <aside
      aria-label="לו״ז יומי"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={panelStyle}
      className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border-2 transition-[border-color,background-color,box-shadow] duration-300"
    >
      <header
        className="shrink-0 px-3 py-2.5"
        style={{ borderBottom: `1px solid ${isDark ? `${accentHex}50` : `${accentHex}40`}` }}
      >
        <div className="flex flex-col items-center">
          <Image
            src="/todo-list-logo.png"
            alt="TODO LIST"
            width={720}
            height={445}
            priority
            className="h-auto w-[7.25rem] object-contain sm:w-[7.75rem]"
          />
        </div>
        <p className="mt-1.5 text-center text-[11px] font-medium leading-relaxed text-text-muted">
          {allowDrop ? "גררו משימה לכאן · סמנו כשסיימתם" : "סמנו משימה ברשימה · סמנו כשסיימתם"}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5">
        {loading && slots.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs font-medium text-text-muted">טוען…</p>
        ) : slots.length === 0 ? (
          <div
            className="flex min-h-[10rem] flex-col items-center justify-center rounded-2xl border border-dashed px-3 text-center transition-colors"
            style={{
              borderColor: isOver ? accentHex : isDark ? `${accentHex}55` : `${accentHex}55`,
              background: isOver
                ? isDark
                  ? `${accentHex}28`
                  : `${accentHex}18`
                : isDark
                  ? "rgba(255,255,255,0.04)"
                  : `${accentHex}0d`,
            }}
          >
            <p className="text-sm font-semibold text-text-primary">
              איתרנו כבר עשרה בטלנים,
              <br />
              תתחיל למלא את הלו״ז שלך!
            </p>
            <p className="mt-1 text-[11px] font-medium text-text-muted">
              {emptyHint ??
                (allowDrop ? "שחררו כאן משימה מהרשימה" : "סמנו ✓ ליד משימה כדי לשייך ללו״ז")}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {slots.map((slot) => {
              const done = Boolean(slot.is_done);
              return (
                <li key={slot.task_id}>
                  <div
                    className={`rounded-xl border px-3 py-2.5 shadow-sm transition-[opacity,filter] duration-200 ${priorityTone[slot.priority]} ${
                      done ? "opacity-45 grayscale-[35%]" : "opacity-100"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <label className="mt-0.5 flex shrink-0 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={done}
                          disabled={busyTaskId === slot.task_id}
                          onChange={(event) =>
                            void toggleDone(slot.task_id, event.target.checked)
                          }
                          className="h-4 w-4 rounded"
                          style={{ accentColor: accentHex }}
                          aria-label={done ? `בטל סימון: ${slot.title}` : `סמן כבוצע: ${slot.title}`}
                        />
                      </label>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold tracking-wide opacity-80">
                          {priorityLabel[slot.priority]}
                        </p>
                        <p
                          className={`mt-0.5 text-[15px] font-semibold leading-snug ${
                            done ? "line-through decoration-black/30 dark:decoration-white/30" : ""
                          }`}
                        >
                          {slot.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyTaskId === slot.task_id}
                        onClick={() => void removeTask(slot.task_id)}
                        className="shrink-0 rounded-lg p-1.5 text-current/70 transition hover:bg-black/10 hover:text-current disabled:opacity-40 dark:hover:bg-white/10"
                        aria-label={`הסר את ${slot.title} מהלו״ז`}
                        title="הסר מהלו״ז"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error ? (
        <p className="shrink-0 border-t border-rose-300/50 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </p>
      ) : null}
    </aside>
  );
}
