"use client";

import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO, addDays, subDays, isToday } from "date-fns";
import { he } from "date-fns/locale";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildDailyPlanHourRange,
  canFitDurationInHour,
  DEFAULT_DAILY_PLAN_HOUR_END,
  DEFAULT_DAILY_PLAN_HOUR_START,
  DEFAULT_DAILY_PLAN_TASK_DURATION,
  DAILY_PLAN_TASK_DURATION_OPTIONS,
  findFreeStartInHour,
  formatHourLabel,
  formatSlotTimeLabel,
  isCurrentPlanHour,
  normalizeDailyPlanHours,
  normalizeTaskDuration,
  rangesOverlap,
  slotMinutesLabel,
  usedMinutesInHour,
  type DailyPlanTaskDuration,
} from "@/lib/daily-planner/hours";

interface PlannerTask {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: "in_progress" | "completed";
  project_id?: string | null;
  project_name?: string | null;
}

interface ProjectTaskGroup {
  key: string;
  name: string;
  tasks: PlannerTask[];
}

function buildProjectGroups(tasks: PlannerTask[]): ProjectTaskGroup[] {
  const groups = new Map<string, ProjectTaskGroup>();
  for (const task of tasks) {
    const name = task.project_name?.trim() || "ללא פרויקט";
    const key = task.project_id ?? `name:${name}`;
    const existing = groups.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      groups.set(key, { key, name, tasks: [task] });
    }
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.name === "ללא פרויקט") return 1;
    if (b.name === "ללא פרויקט") return -1;
    return a.name.localeCompare(b.name, "he");
  });
}

interface PlannerSlot {
  start_minute: number;
  duration_minutes: number;
  task_id: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: "in_progress" | "completed";
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);

const priorityBar: Record<PlannerTask["priority"], string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-rose-500",
};

function formatHourOption(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function pickDefaultDuration(
  hour: number,
  occupancy: { start_minute: number; duration_minutes: number }[],
): DailyPlanTaskDuration {
  const fitting = DAILY_PLAN_TASK_DURATION_OPTIONS.filter((minutes) =>
    canFitDurationInHour(hour, minutes, occupancy),
  );
  if (fitting.includes(DEFAULT_DAILY_PLAN_TASK_DURATION)) return DEFAULT_DAILY_PLAN_TASK_DURATION;
  return fitting[fitting.length - 1] ?? DEFAULT_DAILY_PLAN_TASK_DURATION;
}

interface DailyPlannerPanelProps {
  open: boolean;
  onClose: () => void;
}

export function DailyPlannerPanel({ open, onClose }: DailyPlannerPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [planDate, setPlanDate] = useState(() => toDateKey(new Date()));
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [slots, setSlots] = useState<PlannerSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [hourStart, setHourStart] = useState(DEFAULT_DAILY_PLAN_HOUR_START);
  const [hourEnd, setHourEnd] = useState(DEFAULT_DAILY_PLAN_HOUR_END);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [draftHourStart, setDraftHourStart] = useState(DEFAULT_DAILY_PLAN_HOUR_START);
  const [draftHourEnd, setDraftHourEnd] = useState(DEFAULT_DAILY_PLAN_HOUR_END);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [activeSlotMinute, setActiveSlotMinute] = useState<number | null>(null);
  const [assignHour, setAssignHour] = useState<number | null>(null);
  const [draftTaskId, setDraftTaskId] = useState<string | null>(null);
  const [draftDuration, setDraftDuration] = useState<DailyPlanTaskDuration>(DEFAULT_DAILY_PLAN_TASK_DURATION);
  const [assignSaving, setAssignSaving] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeAssign = useCallback(() => {
    setAssignHour(null);
    setDraftTaskId(null);
    setQuery("");
    setCollapsedProjects(new Set());
  }, []);

  useEffect(() => {
    if (!open) {
      closeAssign();
      setActiveSlotMinute(null);
      setHoursOpen(false);
      setError("");
    }
  }, [open, closeAssign]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/daily-planner?date=${planDate}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError("לא הצלחנו לטעון הלו״ז היומי.");
        return;
      }
      setSlots(
        Array.isArray(data.slots)
          ? data.slots.map((slot: PlannerSlot & { hour?: number }) => ({
              ...slot,
              start_minute: slot.start_minute ?? (slot.hour ?? 0) * 60,
              duration_minutes: normalizeTaskDuration(slot.duration_minutes),
            }))
          : [],
      );
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      const settings = normalizeDailyPlanHours(data.hourStart, data.hourEnd, data.slotMinutes);
      setHourStart(settings.hourStart);
      setHourEnd(settings.hourEnd);
      setDraftHourStart(settings.hourStart);
      setDraftHourEnd(settings.hourEnd);
    } finally {
      setLoading(false);
    }
  }, [planDate]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (assignHour !== null) {
          closeAssign();
          return;
        }
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, assignHour, closeAssign]);

  const occupancy = useMemo(
    () =>
      slots.map((slot) => ({
        start_minute: slot.start_minute,
        duration_minutes: slot.duration_minutes,
      })),
    [slots],
  );

  const scheduledTaskIds = useMemo(() => new Set(slots.map((slot) => slot.task_id)), [slots]);

  const availableTasks = useMemo(
    () => tasks.filter((task) => !scheduledTaskIds.has(task.id)),
    [tasks, scheduledTaskIds],
  );

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableTasks;
    return availableTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(q) ||
        (task.project_name ?? "").toLowerCase().includes(q),
    );
  }, [availableTasks, query]);

  const projectGroups = useMemo(() => buildProjectGroups(filteredTasks), [filteredTasks]);
  const searchActive = query.trim().length > 0;

  const selectedDate = parseISO(planDate);
  const planIsToday = isToday(selectedDate);
  const now = new Date();
  const visibleHours = useMemo(
    () => buildDailyPlanHourRange({ hourStart, hourEnd }),
    [hourStart, hourEnd],
  );
  const dateLine = format(selectedDate, "EEEE, d בMMMM", { locale: he });
  const plannedMinutes = useMemo(
    () => slots.reduce((sum, slot) => sum + slot.duration_minutes, 0),
    [slots],
  );

  const assignFreeMinutes =
    assignHour === null ? 0 : 60 - usedMinutesInHour(assignHour, occupancy);

  const fittingDurations = useMemo(() => {
    if (assignHour === null) return [...DAILY_PLAN_TASK_DURATION_OPTIONS];
    return DAILY_PLAN_TASK_DURATION_OPTIONS.filter((minutes) =>
      canFitDurationInHour(assignHour, minutes, occupancy),
    );
  }, [assignHour, occupancy]);

  useEffect(() => {
    if (assignHour === null) return;
    if (fittingDurations.includes(draftDuration)) return;
    if (fittingDurations.length > 0) setDraftDuration(fittingDurations[fittingDurations.length - 1]);
  }, [assignHour, draftDuration, fittingDurations]);

  const draftTask = tasks.find((task) => task.id === draftTaskId);

  const openAssign = (hour: number) => {
    const free = 60 - usedMinutesInHour(hour, occupancy);
    if (free <= 0) {
      setError("השעה הזו מלאה.");
      return;
    }
    setError("");
    setActiveSlotMinute(null);
    setAssignHour(hour);
    setDraftTaskId(null);
    setDraftDuration(pickDefaultDuration(hour, occupancy));
    setQuery("");
  };

  const saveHours = async () => {
    setHoursSaving(true);
    setError("");
    try {
      const response = await fetch("/api/daily-planner/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourStart: draftHourStart,
          hourEnd: draftHourEnd,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError("עדכון שעות היום נכשל.");
        return;
      }
      const settings = normalizeDailyPlanHours(data.hourStart, data.hourEnd, data.slotMinutes);
      setHourStart(settings.hourStart);
      setHourEnd(settings.hourEnd);
      setDraftHourStart(settings.hourStart);
      setDraftHourEnd(settings.hourEnd);
      setHoursOpen(false);
    } finally {
      setHoursSaving(false);
    }
  };

  const clearSlot = async (startMinute: number) => {
    setSavingKey(`m-${startMinute}`);
    setError("");
    try {
      const response = await fetch("/api/daily-planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDate, startMinute, taskId: null }),
      });
      if (!response.ok) {
        setError("שמירת השיבוץ נכשלה.");
        return;
      }
      await load();
      setActiveSlotMinute(null);
    } finally {
      setSavingKey(null);
    }
  };

  const confirmAssign = async () => {
    if (assignHour === null || !draftTaskId) return;
    if (!canFitDurationInHour(assignHour, draftDuration, occupancy)) {
      setError("אין מספיק מקום בשעה הזו למשך שנבחר.");
      return;
    }
    setAssignSaving(true);
    setError("");
    try {
      const response = await fetch("/api/daily-planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDate,
          hour: assignHour,
          taskId: draftTaskId,
          durationMinutes: draftDuration,
        }),
      });
      if (response.status === 409) {
        setError("אין מספיק מקום בשעה הזו למשך שנבחר.");
        return;
      }
      if (!response.ok) {
        setError("שמירת השיבוץ נכשלה.");
        return;
      }
      await load();
      closeAssign();
    } finally {
      setAssignSaving(false);
    }
  };

  const handleDurationChange = async (slot: PlannerSlot, durationMinutes: DailyPlanTaskDuration) => {
    const hour = Math.floor(slot.start_minute / 60);
    const hourEndBound = hour * 60 + 60;
    const others = occupancy.filter((entry) => entry.start_minute !== slot.start_minute);
    const fitsHere =
      slot.start_minute + durationMinutes <= hourEndBound &&
      !others.some((entry) =>
        rangesOverlap(
          slot.start_minute,
          durationMinutes,
          entry.start_minute,
          entry.duration_minutes,
        ),
      );

    if (fitsHere) {
      setSavingKey(`m-${slot.start_minute}`);
      setError("");
      try {
        const response = await fetch("/api/daily-planner", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planDate,
            startMinute: slot.start_minute,
            taskId: slot.task_id,
            durationMinutes,
          }),
        });
        if (!response.ok) {
          setError("שמירת השיבוץ נכשלה.");
          return;
        }
        await load();
      } finally {
        setSavingKey(null);
      }
      return;
    }

    const freeStart = findFreeStartInHour(hour, durationMinutes, occupancy, slot.start_minute);
    if (freeStart === null) {
      setError("אין מספיק מקום בשעה הזו למשך שנבחר.");
      return;
    }

    setSavingKey(`m-${slot.start_minute}`);
    setError("");
    try {
      const clearResponse = await fetch("/api/daily-planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDate, startMinute: slot.start_minute, taskId: null }),
      });
      if (!clearResponse.ok) {
        setError("שמירת השיבוץ נכשלה.");
        return;
      }
      const placeResponse = await fetch("/api/daily-planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDate,
          startMinute: freeStart,
          taskId: slot.task_id,
          durationMinutes,
        }),
      });
      if (!placeResponse.ok) {
        setError("שמירת השיבוץ נכשלה.");
        await load();
        return;
      }
      await load();
      setActiveSlotMinute(freeStart);
    } finally {
      setSavingKey(null);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="סגירה"
            className="fixed inset-0 z-[80] bg-black/50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="fixed left-0 top-0 z-[85] flex h-dvh max-h-dvh w-[min(400px,100vw)] flex-col overflow-hidden border-e border-black/10 bg-[#f7f8fa] shadow-2xl sm:w-[min(440px,94vw)] dark:border-white/10 dark:bg-[#12141b]"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            aria-label="לו״ז יומי"
          >
            <header className="shrink-0 border-b border-black/10 bg-white px-4 pb-3 pt-4 dark:border-white/10 dark:bg-[#161922]">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[17px] font-bold text-text-primary">לו״ז יומי</h2>
                    {planIsToday ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        היום
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12px] text-text-muted">{dateLine}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-text-secondary hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                  aria-label="סגירה"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPlanDate(toDateKey(subDays(selectedDate, 1)))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-text-secondary hover:bg-slate-200 dark:bg-slate-800"
                  aria-label="יום קודם"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="min-w-0 flex-1 rounded-lg bg-slate-100 px-3 py-1.5 text-center text-[12px] font-semibold text-text-secondary dark:bg-slate-800">
                  {format(selectedDate, "d MMMM yyyy", { locale: he })}
                </div>
                <button
                  type="button"
                  onClick={() => setPlanDate(toDateKey(addDays(selectedDate, 1)))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-text-secondary hover:bg-slate-200 dark:bg-slate-800"
                  aria-label="יום הבא"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHoursOpen((value) => !value);
                    setDraftHourStart(hourStart);
                    setDraftHourEnd(hourEnd);
                  }}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                    hoursOpen
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                      : "bg-slate-100 text-text-secondary hover:bg-slate-200 dark:bg-slate-800"
                  }`}
                  aria-label="טווח שעות"
                >
                  <Settings2 size={15} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="rounded-lg bg-slate-100 px-2.5 py-1 text-[12px] dark:bg-slate-800">
                  <span className="font-extrabold text-text-primary">{slots.length}</span>
                  <span className="ms-1 font-medium text-text-muted">משימות</span>
                </div>
                <div className="rounded-lg bg-slate-100 px-2.5 py-1 text-[12px] dark:bg-slate-800">
                  <span className="font-extrabold text-text-primary">{plannedMinutes}</span>
                  <span className="ms-1 font-medium text-text-muted">דק׳</span>
                </div>
                {!planIsToday ? (
                  <button
                    type="button"
                    onClick={() => setPlanDate(toDateKey(new Date()))}
                    className="ms-auto rounded-lg bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                  >
                    חזרה להיום
                  </button>
                ) : null}
              </div>

              <AnimatePresence initial={false}>
                {hoursOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800">
                      <span className="text-[11px] font-semibold text-text-muted">טווח</span>
                      <select
                        value={draftHourStart}
                        onChange={(event) => setDraftHourStart(Number(event.target.value))}
                        className="rounded-lg border-0 bg-white px-2 py-1.5 text-[12px] font-bold dark:bg-slate-900"
                        aria-label="משעה"
                      >
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={`start-${hour}`} value={hour} disabled={hour >= draftHourEnd}>
                            {formatHourOption(hour)}
                          </option>
                        ))}
                      </select>
                      <span className="text-text-muted">–</span>
                      <select
                        value={draftHourEnd}
                        onChange={(event) => setDraftHourEnd(Number(event.target.value))}
                        className="rounded-lg border-0 bg-white px-2 py-1.5 text-[12px] font-bold dark:bg-slate-900"
                        aria-label="עד שעה"
                      >
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={`end-${hour}`} value={hour} disabled={hour <= draftHourStart}>
                            {formatHourOption(hour)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void saveHours()}
                        disabled={hoursSaving || draftHourEnd <= draftHourStart}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-extrabold text-white disabled:opacity-40"
                      >
                        {hoursSaving ? "…" : "שמור"}
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </header>

            <section className="relative min-h-0 flex-1 bg-[#f7f8fa] dark:bg-[#12141b]">
              <div className="h-full overflow-y-auto px-3 py-3">
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-12 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
                        aria-hidden
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {visibleHours.map((hour) => {
                      const hourSlots = slots
                        .filter((slot) => Math.floor(slot.start_minute / 60) === hour)
                        .sort((a, b) => a.start_minute - b.start_minute);
                      const used = usedMinutesInHour(hour, occupancy);
                      const free = 60 - used;
                      const busy =
                        savingKey === `h-${hour}` ||
                        hourSlots.some((slot) => savingKey === `m-${slot.start_minute}`);
                      const isNow = planIsToday && isCurrentPlanHour(hour, now);
                      const isTarget = assignHour === hour;
                      const isEmpty = hourSlots.length === 0;

                      return (
                        <div
                          key={hour}
                          className={`grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-2 rounded-xl p-1 ${
                            isTarget
                              ? "bg-violet-50 dark:bg-violet-950/40"
                              : isNow
                                ? "bg-teal-50/70 dark:bg-teal-950/30"
                                : ""
                          }`}
                        >
                          <div
                            className={`pt-2.5 text-end text-[11px] font-bold tabular-nums ${
                              isNow ? "text-teal-700 dark:text-teal-300" : "text-text-muted"
                            }`}
                          >
                            {formatHourLabel(hour)}
                          </div>

                          <div className="min-w-0">
                            {isEmpty ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => openAssign(hour)}
                                className={`flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-start transition ${
                                  isTarget
                                    ? "border-violet-400 bg-white dark:border-violet-500 dark:bg-slate-900"
                                    : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-600"
                                }`}
                              >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-text-muted dark:bg-slate-800">
                                  <Plus size={14} strokeWidth={2.5} />
                                </span>
                                <span className="text-[12px] font-semibold text-text-muted">הוסף משימה</span>
                              </button>
                            ) : (
                              <div className="space-y-1.5">
                                {hourSlots.map((slot) => {
                                  const expanded = activeSlotMinute === slot.start_minute;
                                  return (
                                    <div
                                      key={slot.start_minute}
                                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                                    >
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          setActiveSlotMinute((current) =>
                                            current === slot.start_minute ? null : slot.start_minute,
                                          )
                                        }
                                        className="flex w-full items-stretch gap-0 text-start"
                                      >
                                        <span
                                          className={`w-1.5 shrink-0 ${priorityBar[slot.priority]}`}
                                          aria-hidden
                                        />
                                        <span className="min-w-0 flex-1 px-3 py-2.5">
                                          <span className="block truncate text-[13px] font-bold text-text-primary">
                                            {slot.title}
                                          </span>
                                          <span className="mt-0.5 block text-[11px] font-semibold text-text-muted">
                                            {formatSlotTimeLabel(slot.start_minute)} ·{" "}
                                            {slotMinutesLabel(slot.duration_minutes)}
                                          </span>
                                        </span>
                                      </button>

                                      <AnimatePresence initial={false}>
                                        {expanded ? (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                                              {DAILY_PLAN_TASK_DURATION_OPTIONS.map((minutes) => (
                                                <button
                                                  key={minutes}
                                                  type="button"
                                                  disabled={busy}
                                                  onClick={() => void handleDurationChange(slot, minutes)}
                                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                                                    slot.duration_minutes === minutes
                                                      ? "bg-violet-600 text-white"
                                                      : "bg-slate-100 text-text-secondary dark:bg-slate-800"
                                                  }`}
                                                >
                                                  {slotMinutesLabel(minutes)}
                                                </button>
                                              ))}
                                              <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => void clearSlot(slot.start_minute)}
                                                className="ms-auto inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300"
                                                aria-label="הסר משימה"
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            </div>
                                          </motion.div>
                                        ) : null}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}

                                {free > 0 ? (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => openAssign(hour)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-text-muted hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900"
                                  >
                                    <Plus size={12} strokeWidth={2.5} />
                                    עוד {free} דק׳
                                  </button>
                                ) : (
                                  <p className="px-1 text-[10px] font-semibold text-text-muted">מלא</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <AnimatePresence>
                {assignHour !== null ? (
                  <>
                    <motion.button
                      type="button"
                      aria-label="סגור בחירה"
                      className="absolute inset-0 z-10 border-0 bg-slate-950/45"
                      onClick={closeAssign}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                    <motion.div
                      className="absolute inset-x-0 bottom-0 z-20 flex max-h-[82%] flex-col rounded-t-2xl bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.18)] dark:bg-[#171b26]"
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "tween", duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
                    >
                      <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-slate-300 dark:bg-slate-600" />

                      <div className="flex items-start gap-3 px-4 pb-3 pt-3">
                        <div className="inline-flex h-10 min-w-14 items-center justify-center rounded-xl bg-violet-100 px-2 text-[13px] font-extrabold tabular-nums text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                          {formatHourLabel(assignHour)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold text-text-primary">שיבוץ משימה</p>
                          <p className="text-[12px] text-text-muted">נותרו {assignFreeMinutes} דקות</p>
                        </div>
                        <button
                          type="button"
                          onClick={closeAssign}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"
                          aria-label="סגור"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="px-4 pb-3">
                        <p className="mb-2 text-[11px] font-bold text-text-muted">משך</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {fittingDurations.map((minutes) => (
                            <button
                              key={minutes}
                              type="button"
                              onClick={() => setDraftDuration(minutes)}
                              className={`rounded-xl py-2.5 text-[12px] font-extrabold ${
                                draftDuration === minutes
                                  ? "bg-violet-600 text-white"
                                  : "bg-slate-100 text-text-secondary dark:bg-slate-800"
                              }`}
                            >
                              {slotMinutesLabel(minutes)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="px-4 pb-2">
                        <div className="relative">
                          <Search
                            size={15}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                          />
                          <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="חיפוש משימה…"
                            className="w-full rounded-xl border-0 bg-slate-100 py-2.5 pe-3 ps-9 text-sm outline-none ring-violet-400 focus:ring-2 dark:bg-slate-800"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
                        {filteredTasks.length === 0 ? (
                          <p className="mx-1 my-6 rounded-xl bg-slate-100 px-4 py-8 text-center text-[12px] font-semibold text-text-muted dark:bg-slate-800">
                            {availableTasks.length === 0 ? "אין משימות פנויות לשיבוץ" : "אין תוצאות"}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {projectGroups.map((group) => {
                              const collapsed = !searchActive && collapsedProjects.has(group.key);
                              return (
                                <section
                                  key={group.key}
                                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (searchActive) return;
                                      setCollapsedProjects((current) => {
                                        const next = new Set(current);
                                        if (next.has(group.key)) next.delete(group.key);
                                        else next.add(group.key);
                                        return next;
                                      });
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-start"
                                  >
                                    <FolderKanban
                                      size={14}
                                      className="shrink-0 text-violet-600 dark:text-violet-300"
                                    />
                                    <span className="min-w-0 flex-1 truncate text-[12px] font-extrabold text-text-primary">
                                      {group.name}
                                    </span>
                                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-text-muted dark:bg-slate-800">
                                      {group.tasks.length}
                                    </span>
                                    {!searchActive ? (
                                      <ChevronDown
                                        size={14}
                                        className={`text-text-muted transition-transform ${collapsed ? "" : "rotate-180"}`}
                                      />
                                    ) : null}
                                  </button>

                                  {!collapsed ? (
                                    <ul className="space-y-1 border-t border-slate-200 px-1.5 py-1.5 dark:border-slate-700">
                                      {group.tasks.map((task) => {
                                        const selected = draftTaskId === task.id;
                                        return (
                                          <li key={task.id}>
                                            <button
                                              type="button"
                                              onClick={() => setDraftTaskId(task.id)}
                                              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-start ${
                                                selected
                                                  ? "bg-violet-50 ring-2 ring-violet-400 dark:bg-violet-950/50"
                                                  : "bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                                              }`}
                                            >
                                              <span
                                                className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityBar[task.priority]}`}
                                              />
                                              <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-text-primary">
                                                {task.title}
                                              </span>
                                              <span
                                                className={`h-4 w-4 shrink-0 rounded-full ${
                                                  selected
                                                    ? "bg-violet-600 ring-2 ring-white ring-offset-1"
                                                    : "border-2 border-slate-300 dark:border-slate-600"
                                                }`}
                                                aria-hidden
                                              />
                                            </button>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  ) : null}
                                </section>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                        <button
                          type="button"
                          disabled={!draftTaskId || assignSaving || fittingDurations.length === 0}
                          onClick={() => void confirmAssign()}
                          className="w-full rounded-xl bg-violet-600 py-3 text-[14px] font-extrabold text-white shadow-lg shadow-violet-600/25 disabled:opacity-40 disabled:shadow-none"
                        >
                          {assignSaving
                            ? "משבץ…"
                            : draftTask
                              ? `שבץ · ${slotMinutesLabel(draftDuration)}`
                              : "בחר משימה"}
                        </button>
                      </div>
                    </motion.div>
                  </>
                ) : null}
              </AnimatePresence>
            </section>

            {error ? (
              <p className="shrink-0 border-t border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
                {error}
              </p>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
