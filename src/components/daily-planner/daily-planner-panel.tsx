"use client";

import { AnimatePresence, motion } from "framer-motion";
import { addDays, format, isToday, parseISO, subDays } from "date-fns";
import { he } from "date-fns/locale";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderKanban,
  GripHorizontal,
  GripVertical,
  Minus,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  DailyPlannerClient,
  type DailyPlannerSlot,
  type DailyPlannerSnapshot,
  type DailyPlannerTask,
} from "@/lib/daily-planner/daily-planner-client";
import {
  buildDailyPlanHourRange,
  DAILY_PLAN_TASK_DURATION_OPTIONS,
  DEFAULT_DAILY_PLAN_HOUR_END,
  DEFAULT_DAILY_PLAN_HOUR_START,
  DEFAULT_DAILY_PLAN_TASK_DURATION,
  formatHourLabel,
  formatSlotTimeLabel,
  MAX_DAILY_PLAN_TASK_DURATION,
  MIN_DAILY_PLAN_TASK_DURATION,
  normalizeDailyPlanHours,
  normalizeTaskDuration,
  slotMinutesLabel,
} from "@/lib/daily-planner/hours";

const HOUR_HEIGHT = 84;
const DURATION_BUTTON_STEP = 5;
const RESIZE_DURATION_STEP = 5;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);

const priorityStyle: Record<DailyPlannerTask["priority"], string> = {
  low: "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-100",
  medium: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100",
  high: "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-100",
};

interface DailyPlannerTaskGroup {
  key: string;
  name: string;
  tasks: DailyPlannerTask[];
}

class DailyPlannerTaskGrouper {
  public static keyFor(task: DailyPlannerTask): string {
    const name = task.project_name?.trim() || "ללא פרויקט";
    return task.project_id ?? `project:${name}`;
  }

  public static group(tasks: DailyPlannerTask[]): DailyPlannerTaskGroup[] {
    const groups = new Map<string, DailyPlannerTaskGroup>();
    for (const task of tasks) {
      const name = task.project_name?.trim() || "ללא פרויקט";
      const key = this.keyFor(task);
      const group = groups.get(key);
      if (group) group.tasks.push(task);
      else groups.set(key, { key, name, tasks: [task] });
    }
    return Array.from(groups.values()).sort((left, right) => {
      if (left.name === "ללא פרויקט") return 1;
      if (right.name === "ללא פרויקט") return -1;
      return left.name.localeCompare(right.name, "he");
    });
  }
}

interface ResizeGesture {
  pointerId: number;
  slotStart: number;
  startClientY: number;
  initialDuration: number;
  previewDuration: number;
  maxDuration: number;
  pixelsPerMinute: number;
}

interface MoveGesture {
  pointerId: number;
  slotStart: number;
  startClientY: number;
  targetHour: number;
  moved: boolean;
}

class DailyPlannerTimeline {
  private static scaledPixels(pixels: number): string {
    return `calc(${pixels}px * var(--app-font-scale, 1))`;
  }

  public static top(startMinute: number, rangeStart: number, offset = 0): string {
    return this.scaledPixels(((startMinute - rangeStart) / 60) * HOUR_HEIGHT + offset);
  }

  public static height(durationMinutes: number): string {
    return this.scaledPixels(Math.max(24, (durationMinutes / 60) * HOUR_HEIGHT - 3));
  }

  public static hourTop(index: number, offset = 0): string {
    return this.scaledPixels(index * HOUR_HEIGHT + offset);
  }

  public static hourHeight(inset = 0): string {
    return this.scaledPixels(HOUR_HEIGHT - inset);
  }

  public static totalHeight(hourCount: number): string {
    return this.scaledPixels(hourCount * HOUR_HEIGHT);
  }

  public static resizeDuration(
    initialDuration: number,
    deltaPixels: number,
    pixelsPerMinute: number,
    maxDuration: number,
  ): number {
    const rawDuration = initialDuration + deltaPixels / pixelsPerMinute;
    const steppedDuration =
      Math.round(rawDuration / RESIZE_DURATION_STEP) * RESIZE_DURATION_STEP;
    return Math.min(
      maxDuration,
      Math.max(MIN_DAILY_PLAN_TASK_DURATION, steppedDuration),
    );
  }

  public static overlapsRange(
    slot: DailyPlannerSlot,
    rangeStart: number,
    rangeEnd: number,
  ): boolean {
    return slot.start_minute < rangeEnd && slot.start_minute + slot.duration_minutes > rangeStart;
  }

  public static appendStart(
    hour: number,
    slots: DailyPlannerSlot[],
    ignoreStartMinute?: number,
  ): number {
    const hourStart = hour * 60;
    const hourEnd = hourStart + 60;
    const occupiedEnds = slots
      .filter(
        (slot) =>
          slot.start_minute !== ignoreStartMinute &&
          slot.start_minute < hourEnd &&
          slot.start_minute + slot.duration_minutes > hourStart,
      )
      .map((slot) => slot.start_minute + slot.duration_minutes);
    return Math.max(hourStart, ...occupiedEnds);
  }
}

interface DailyPlannerPanelProps {
  open: boolean;
  onClose: () => void;
}

export function DailyPlannerPanel({ open, onClose }: DailyPlannerPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [planDate, setPlanDate] = useState(() => DailyPlannerClient.dateKey(new Date()));
  const latestPlanDate = useRef(planDate);
  const [tasks, setTasks] = useState<DailyPlannerTask[]>([]);
  const [slots, setSlots] = useState<DailyPlannerSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedPlanDate, setLoadedPlanDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hourStart, setHourStart] = useState(DEFAULT_DAILY_PLAN_HOUR_START);
  const [hourEnd, setHourEnd] = useState(DEFAULT_DAILY_PLAN_HOUR_END);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [draftHourStart, setDraftHourStart] = useState(DEFAULT_DAILY_PLAN_HOUR_START);
  const [draftHourEnd, setDraftHourEnd] = useState(DEFAULT_DAILY_PLAN_HOUR_END);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [editorStart, setEditorStart] = useState<number | null>(null);
  const [editingSlotStart, setEditingSlotStart] = useState<number | null>(null);
  const [draftTaskId, setDraftTaskId] = useState<string | null>(null);
  const [draftDuration, setDraftDuration] = useState(DEFAULT_DAILY_PLAN_TASK_DURATION);
  const [query, setQuery] = useState("");
  const [expandedTaskGroups, setExpandedTaskGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [draggingSlotStart, setDraggingSlotStart] = useState<number | null>(null);
  const [dropHour, setDropHour] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const moveGestureRef = useRef<MoveGesture | null>(null);
  const resizeGestureRef = useRef<ResizeGesture | null>(null);
  const [resizingSlotStart, setResizingSlotStart] = useState<number | null>(null);
  const [resizePreviewDuration, setResizePreviewDuration] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    latestPlanDate.current = planDate;
  }, [planDate]);

  const closeEditor = useCallback(() => {
    setEditorStart(null);
    setEditingSlotStart(null);
    setDraftTaskId(null);
    setDraftDuration(DEFAULT_DAILY_PLAN_TASK_DURATION);
    setQuery("");
    setExpandedTaskGroups(new Set());
  }, []);

  useEffect(() => {
    if (open) return;
    closeEditor();
    setHoursOpen(false);
    moveGestureRef.current = null;
    setDraggingSlotStart(null);
    setDropHour(null);
    resizeGestureRef.current = null;
    setResizingSlotStart(null);
    setResizePreviewDuration(null);
    setError("");
  }, [open, closeEditor]);

  const applySnapshot = useCallback((date: string, snapshot: DailyPlannerSnapshot) => {
    if (latestPlanDate.current !== date) return;
    setSlots(
      snapshot.slots.map((slot) => ({
        ...slot,
        duration_minutes: normalizeTaskDuration(slot.duration_minutes),
      })),
    );
    setTasks(snapshot.tasks);
    const settings = normalizeDailyPlanHours(
      snapshot.hourStart,
      snapshot.hourEnd,
      snapshot.slotMinutes,
    );
    setHourStart(settings.hourStart);
    setHourEnd(settings.hourEnd);
    setDraftHourStart(settings.hourStart);
    setDraftHourEnd(settings.hourEnd);
    setLoadedPlanDate(date);
  }, []);

  const load = useCallback(async () => {
    const cached = DailyPlannerClient.getCached(planDate);
    if (cached) {
      applySnapshot(planDate, cached);
      setLoading(false);
      if (DailyPlannerClient.isFresh(planDate)) return;
    }
    setLoading(true);
    setError("");
    try {
      applySnapshot(planDate, await DailyPlannerClient.load(planDate, Boolean(cached)));
    } catch {
      if (!cached && latestPlanDate.current === planDate) {
        setError("לא הצלחנו לטעון את המשימות להיום.");
      }
    } finally {
      if (latestPlanDate.current === planDate) setLoading(false);
    }
  }, [applySnapshot, planDate]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editorStart !== null) closeEditor();
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, editorStart, closeEditor, onClose]);

  const selectedDate = parseISO(planDate);
  const planIsToday = isToday(selectedDate);
  const visibleHours = useMemo(
    () => buildDailyPlanHourRange({ hourStart, hourEnd }),
    [hourStart, hourEnd],
  );
  const rangeStart = visibleHours[0] * 60;
  const rangeEnd = Math.min(24 * 60, (visibleHours.at(-1) ?? hourEnd) * 60 + 60);
  const timelineHeight = DailyPlannerTimeline.totalHeight(visibleHours.length);
  const plannedMinutes = slots.reduce((sum, slot) => sum + slot.duration_minutes, 0);
  const scheduledTaskIds = useMemo(
    () =>
      new Set(
        slots
          .filter((slot) => slot.start_minute !== editingSlotStart)
          .map((slot) => slot.task_id),
      ),
    [slots, editingSlotStart],
  );
  const availableTasks = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("he");
    return tasks.filter((task) => {
      if (scheduledTaskIds.has(task.id)) return false;
      if (!search) return true;
      return (
        task.title.toLocaleLowerCase("he").includes(search) ||
        (task.project_name ?? "").toLocaleLowerCase("he").includes(search)
      );
    });
  }, [query, scheduledTaskIds, tasks]);
  const availableTaskGroups = useMemo(
    () => DailyPlannerTaskGrouper.group(availableTasks),
    [availableTasks],
  );
  const taskSearchActive = query.trim().length > 0;
  const maxDraftDuration =
    editorStart === null
      ? MAX_DAILY_PLAN_TASK_DURATION
      : Math.min(MAX_DAILY_PLAN_TASK_DURATION, 24 * 60 - editorStart);

  const selectPlanDate = (date: Date) => {
    setLoading(true);
    closeEditor();
    setPlanDate(DailyPlannerClient.dateKey(date));
  };

  const openNewTask = (startMinute: number) => {
    if (startMinute >= 24 * 60) {
      setError("אין יותר מקום ביום הזה.");
      return;
    }
    setError("");
    setEditorStart(startMinute);
    setEditingSlotStart(null);
    setDraftTaskId(null);
    setDraftDuration(Math.min(DEFAULT_DAILY_PLAN_TASK_DURATION, 24 * 60 - startMinute));
    setQuery("");
    setExpandedTaskGroups(new Set());
  };

  const openNewTaskForHour = (hour: number) => {
    openNewTask(DailyPlannerTimeline.appendStart(hour, slots));
  };

  const openExistingTask = (slot: DailyPlannerSlot) => {
    setError("");
    setEditorStart(slot.start_minute);
    setEditingSlotStart(slot.start_minute);
    setDraftTaskId(slot.task_id);
    setDraftDuration(slot.duration_minutes);
    setQuery("");
    const task = tasks.find((candidate) => candidate.id === slot.task_id);
    setExpandedTaskGroups(
      task ? new Set([DailyPlannerTaskGrouper.keyFor(task)]) : new Set(),
    );
  };

  const changeDuration = (direction: -1 | 1) => {
    setDraftDuration((current) =>
      Math.min(
        maxDraftDuration,
        Math.max(MIN_DAILY_PLAN_TASK_DURATION, current + direction * DURATION_BUTTON_STEP),
      ),
    );
  };

  const setExactDuration = (value: string) => {
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return;
    setDraftDuration(
      Math.min(maxDraftDuration, Math.max(MIN_DAILY_PLAN_TASK_DURATION, Math.round(minutes))),
    );
  };

  const saveTask = async () => {
    if (editorStart === null || !draftTaskId) return;
    setSaving(true);
    setError("");
    try {
      const result = await DailyPlannerClient.assign({
        planDate,
        startMinute: editorStart,
        taskId: draftTaskId,
        durationMinutes: draftDuration,
        previousStartMinute: editingSlotStart ?? undefined,
      });
      const task = tasks.find((candidate) => candidate.id === draftTaskId);
      if (!task) {
        await load();
        closeEditor();
        return;
      }
      const nextSlot: DailyPlannerSlot = {
        start_minute: result.startMinute,
        duration_minutes: result.durationMinutes,
        task_id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
      };
      setSlots((current) => {
        const next = [
          ...current.filter((slot) => slot.start_minute !== editingSlotStart),
          nextSlot,
        ].sort((left, right) => left.start_minute - right.start_minute);
        DailyPlannerClient.updateSlots(planDate, next);
        return next;
      });
      closeEditor();
    } catch (saveError) {
      setError(
        saveError instanceof Error && saveError.message === "TIME_CONFLICT"
          ? "הזמן הזה כבר תפוס. אפשר לבחור שעה אחרת או לקצר את המשימה."
          : "שמירת המשימה נכשלה.",
      );
    } finally {
      setSaving(false);
    }
  };

  const moveTaskToHour = async (hour: number, slotStart = draggingSlotStart) => {
    if (slotStart === null) return;
    const draggedSlot = slots.find((slot) => slot.start_minute === slotStart);
    if (!draggedSlot) return;
    const targetStart = DailyPlannerTimeline.appendStart(hour, slots, slotStart);
    setDropHour(null);
    if (targetStart + draggedSlot.duration_minutes > 24 * 60) {
      setDraggingSlotStart(null);
      setError("אין מספיק זמן פנוי בשעה הזו.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await DailyPlannerClient.assign({
        planDate,
        startMinute: targetStart,
        taskId: draggedSlot.task_id,
        durationMinutes: draggedSlot.duration_minutes,
        previousStartMinute: slotStart,
      });
      setSlots((current) => {
        const next = current
          .map((slot) =>
            slot.start_minute === slotStart
              ? {
                  ...slot,
                  start_minute: result.startMinute,
                  duration_minutes: result.durationMinutes,
                }
              : slot,
          )
          .sort((left, right) => left.start_minute - right.start_minute);
        DailyPlannerClient.updateSlots(planDate, next);
        return next;
      });
    } catch (moveError) {
      setError(
        moveError instanceof Error && moveError.message === "TIME_CONFLICT"
          ? "אין מספיק זמן פנוי בשעה הזו."
          : "העברת המשימה נכשלה.",
      );
    } finally {
      setSaving(false);
      setDraggingSlotStart(null);
      setDropHour(null);
    }
  };

  const beginMove = (
    event: ReactPointerEvent<HTMLSpanElement>,
    slot: DailyPlannerSlot,
  ) => {
    if (saving || resizeGestureRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    moveGestureRef.current = {
      pointerId: event.pointerId,
      slotStart: slot.start_minute,
      startClientY: event.clientY,
      targetHour: Math.floor(slot.start_minute / 60),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const gesture = moveGestureRef.current;
    const timeline = timelineRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !timeline) return;
    event.preventDefault();
    event.stopPropagation();
    if (!gesture.moved && Math.abs(event.clientY - gesture.startClientY) < 6) return;
    const rootScale = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--app-font-scale"),
    );
    const rowHeight = HOUR_HEIGHT * (Number.isFinite(rootScale) ? rootScale : 1);
    const timelineRect = timeline.getBoundingClientRect();
    const hourIndex = Math.min(
      visibleHours.length - 1,
      Math.max(0, Math.floor((event.clientY - timelineRect.top) / rowHeight)),
    );
    const targetHour = visibleHours[hourIndex];
    gesture.moved = true;
    gesture.targetHour = targetHour;
    setDraggingSlotStart(gesture.slotStart);
    setDropHour(targetHour);
  };

  const finishMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const gesture = moveGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    moveGestureRef.current = null;
    setDraggingSlotStart(null);
    setDropHour(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const originalHour = Math.floor(gesture.slotStart / 60);
    if (gesture.moved && gesture.targetHour !== originalHour) {
      void moveTaskToHour(gesture.targetHour, gesture.slotStart);
    }
  };

  const cancelMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const gesture = moveGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    moveGestureRef.current = null;
    setDraggingSlotStart(null);
    setDropHour(null);
  };

  const updateLocalSlotDuration = (slotStart: number, durationMinutes: number) => {
    setSlots((current) => {
      const next = current.map((slot) =>
        slot.start_minute === slotStart
          ? { ...slot, duration_minutes: durationMinutes }
          : slot,
      );
      DailyPlannerClient.updateSlots(planDate, next);
      return next;
    });
  };

  const persistResizedDuration = async (gesture: ResizeGesture) => {
    const slot = slots.find((candidate) => candidate.start_minute === gesture.slotStart);
    if (!slot || gesture.previewDuration === gesture.initialDuration) return;
    updateLocalSlotDuration(gesture.slotStart, gesture.previewDuration);
    setSaving(true);
    setError("");
    try {
      const result = await DailyPlannerClient.assign({
        planDate,
        startMinute: gesture.slotStart,
        taskId: slot.task_id,
        durationMinutes: gesture.previewDuration,
        previousStartMinute: gesture.slotStart,
      });
      updateLocalSlotDuration(gesture.slotStart, result.durationMinutes);
    } catch (resizeError) {
      updateLocalSlotDuration(gesture.slotStart, gesture.initialDuration);
      setError(
        resizeError instanceof Error && resizeError.message === "TIME_CONFLICT"
          ? "אי אפשר להרחיב את המשימה מעבר למשימה הבאה."
          : "עדכון משך המשימה נכשל.",
      );
    } finally {
      setSaving(false);
    }
  };

  const beginResize = (
    event: ReactPointerEvent<HTMLSpanElement>,
    slot: DailyPlannerSlot,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const nextSlotStart = slots
      .filter((candidate) => candidate.start_minute > slot.start_minute)
      .reduce(
        (nearest, candidate) => Math.min(nearest, candidate.start_minute),
        24 * 60,
      );
    const rootScale = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--app-font-scale"),
    );
    const pixelsPerMinute = (HOUR_HEIGHT * (Number.isFinite(rootScale) ? rootScale : 1)) / 60;
    const gesture: ResizeGesture = {
      pointerId: event.pointerId,
      slotStart: slot.start_minute,
      startClientY: event.clientY,
      initialDuration: slot.duration_minutes,
      previewDuration: slot.duration_minutes,
      maxDuration: nextSlotStart - slot.start_minute,
      pixelsPerMinute,
    };
    resizeGestureRef.current = gesture;
    setDraggingSlotStart(null);
    setDropHour(null);
    setResizingSlotStart(slot.start_minute);
    setResizePreviewDuration(slot.duration_minutes);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const gesture = resizeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const duration = DailyPlannerTimeline.resizeDuration(
      gesture.initialDuration,
      event.clientY - gesture.startClientY,
      gesture.pixelsPerMinute,
      gesture.maxDuration,
    );
    gesture.previewDuration = duration;
    setResizePreviewDuration(duration);
  };

  const finishResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const gesture = resizeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    resizeGestureRef.current = null;
    setResizingSlotStart(null);
    setResizePreviewDuration(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    void persistResizedDuration(gesture);
  };

  const cancelResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const gesture = resizeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    resizeGestureRef.current = null;
    setResizingSlotStart(null);
    setResizePreviewDuration(null);
  };

  const removeTask = async () => {
    if (editingSlotStart === null) return;
    setSaving(true);
    setError("");
    try {
      await DailyPlannerClient.remove(planDate, editingSlotStart);
      setSlots((current) => {
        const next = current.filter((slot) => slot.start_minute !== editingSlotStart);
        DailyPlannerClient.updateSlots(planDate, next);
        return next;
      });
      closeEditor();
    } catch {
      setError("הסרת המשימה נכשלה.");
    } finally {
      setSaving(false);
    }
  };

  const saveHours = async () => {
    setHoursSaving(true);
    setError("");
    try {
      const response = await fetch("/api/daily-planner/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hourStart: draftHourStart, hourEnd: draftHourEnd }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error();
      const settings = normalizeDailyPlanHours(data.hourStart, data.hourEnd, data.slotMinutes);
      setHourStart(settings.hourStart);
      setHourEnd(settings.hourEnd);
      setHoursOpen(false);
    } catch {
      setError("עדכון טווח השעות נכשל.");
    } finally {
      setHoursSaving(false);
    }
  };

  if (!mounted) return null;

  const visibleSlots = slots.filter((slot) =>
    DailyPlannerTimeline.overlapsRange(slot, rangeStart, rangeEnd),
  );
  const nowMinute = new Date().getHours() * 60 + new Date().getMinutes();
  const showNow = planIsToday && nowMinute >= rangeStart && nowMinute < rangeEnd;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="סגירה"
            className="fixed inset-0 z-[80] bg-slate-950/50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            dir="rtl"
            className="fixed left-0 top-0 z-[85] flex h-dvh flex-col overflow-hidden border-e border-black/10 bg-white shadow-[20px_0_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[#12141b]"
            style={{ width: "min(calc(480px * var(--app-font-scale, 1)), 100vw)" }}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            aria-label="משימות להיום"
          >
            <header className="relative shrink-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#171a24]">
              {loading ? (
                <motion.div
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-right bg-violet-600"
                  initial={{ scaleX: 0.15 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                />
              ) : null}
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[1.0625rem] font-extrabold text-text-primary">משימות להיום</h2>
                    {planIsToday ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[0.625rem] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                        היום
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[0.75rem] text-text-muted">
                    {format(selectedDate, "EEEE, d בMMMM", { locale: he })} · {slots.length} משימות ·{" "}
                    {slotMinutesLabel(plannedMinutes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-text-secondary hover:bg-slate-200 dark:bg-slate-800"
                  aria-label="סגירה"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => selectPlanDate(subDays(selectedDate, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"
                  aria-label="יום קודם"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => selectPlanDate(new Date())}
                  className="h-8 min-w-0 flex-1 rounded-lg bg-slate-100 px-3 text-[0.75rem] font-bold text-text-secondary dark:bg-slate-800"
                >
                  {format(selectedDate, "d MMMM yyyy", { locale: he })}
                </button>
                <button
                  type="button"
                  onClick={() => selectPlanDate(addDays(selectedDate, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"
                  aria-label="יום הבא"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftHourStart(hourStart);
                    setDraftHourEnd(hourEnd);
                    setHoursOpen((current) => !current);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"
                  aria-label="טווח שעות"
                >
                  <Settings2 size={15} />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {hoursOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
                      <select
                        value={draftHourStart}
                        onChange={(event) => setDraftHourStart(Number(event.target.value))}
                        className="min-w-0 flex-1 rounded-lg bg-white px-2 py-2 text-[0.75rem] font-bold dark:bg-slate-900"
                        aria-label="משעה"
                      >
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour} disabled={hour >= draftHourEnd}>
                            מ־{formatHourLabel(hour)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={draftHourEnd}
                        onChange={(event) => setDraftHourEnd(Number(event.target.value))}
                        className="min-w-0 flex-1 rounded-lg bg-white px-2 py-2 text-[0.75rem] font-bold dark:bg-slate-900"
                        aria-label="עד שעה"
                      >
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour} disabled={hour <= draftHourStart}>
                            עד {formatHourLabel(hour)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void saveHours()}
                        disabled={hoursSaving}
                        className="rounded-lg bg-violet-600 px-3 py-2 text-[0.75rem] font-bold text-white disabled:opacity-40"
                      >
                        {hoursSaving ? "…" : "שמור"}
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </header>

            <section className="relative min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] dark:bg-[#12141b]">
              {loading && loadedPlanDate !== planDate ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                  ))}
                </div>
              ) : (
                <div
                  ref={timelineRef}
                  className="relative mx-3 my-4"
                  style={{ height: timelineHeight }}
                >
                  {visibleHours.map((hour, index) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0"
                      style={{
                        top: DailyPlannerTimeline.hourTop(index),
                        height: DailyPlannerTimeline.hourHeight(),
                      }}
                    >
                      <span className="absolute right-0 top-[-8px] w-12 text-left text-[0.6875rem] font-semibold tabular-nums text-text-muted">
                        {formatHourLabel(hour)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openNewTaskForHour(hour)}
                        className="group absolute bottom-0 left-0 right-14 top-0 border-t border-slate-200 text-right hover:bg-violet-50/70 dark:border-slate-800 dark:hover:bg-violet-950/20"
                        aria-label={`הוסף משימה בשעה ${formatHourLabel(hour)}`}
                      >
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[0.625rem] font-bold text-violet-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-slate-800 dark:text-violet-300">
                          <Plus size={11} />
                          הוסף
                        </span>
                      </button>
                    </div>
                  ))}

                  {showNow ? (
                    <div
                      className="pointer-events-none absolute left-0 right-12 z-20 border-t-2 border-rose-500"
                      style={{ top: DailyPlannerTimeline.top(nowMinute, rangeStart) }}
                    >
                      <span className="absolute -right-1 -top-1.5 h-3 w-3 rounded-full bg-rose-500" />
                    </div>
                  ) : null}

                  {visibleSlots.map((slot) => {
                    const displayedDuration =
                      resizingSlotStart === slot.start_minute && resizePreviewDuration !== null
                        ? resizePreviewDuration
                        : slot.duration_minutes;
                    const clippedStart = Math.max(slot.start_minute, rangeStart);
                    const clippedEnd = Math.min(slot.start_minute + displayedDuration, rangeEnd);
                    const resizing = resizingSlotStart === slot.start_minute;
                    return (
                      <button
                        key={slot.start_minute}
                        type="button"
                        onClick={() => openExistingTask(slot)}
                        className={`absolute left-1 right-[3.65rem] z-10 overflow-hidden rounded-lg border px-2.5 py-1.5 text-right shadow-sm transition hover:brightness-95 ${
                          resizing ? "ring-2 ring-violet-500 ring-offset-1" : ""
                        } ${priorityStyle[slot.priority]}`}
                        style={{
                          top: DailyPlannerTimeline.top(clippedStart, rangeStart, 2),
                          height: DailyPlannerTimeline.height(clippedEnd - clippedStart),
                        }}
                      >
                        <span className="flex items-center gap-1">
                          <span
                            className="inline-flex h-6 w-5 shrink-0 touch-none cursor-grab items-center justify-center rounded-md opacity-55 hover:bg-black/10 hover:opacity-100 active:cursor-grabbing"
                            title="גרור לשעה אחרת"
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => beginMove(event, slot)}
                            onPointerMove={updateMove}
                            onPointerUp={finishMove}
                            onPointerCancel={cancelMove}
                          >
                            <GripVertical size={13} />
                          </span>
                          <span className="block min-w-0 flex-1 truncate text-[0.75rem] font-extrabold">
                            {slot.title}
                          </span>
                        </span>
                        {displayedDuration >= 30 ? (
                          <span className="mt-0.5 block truncate text-[0.625rem] font-semibold opacity-70">
                            {formatSlotTimeLabel(slot.start_minute)}–{formatSlotTimeLabel(
                              slot.start_minute + displayedDuration,
                            )}{" "}
                            · {slotMinutesLabel(displayedDuration)}
                          </span>
                        ) : null}
                        <span
                          className="absolute inset-x-0 bottom-0 flex h-4 touch-none cursor-ns-resize items-end justify-center bg-gradient-to-t from-black/10 to-transparent pb-0.5 opacity-55 transition hover:opacity-100"
                          title="גרור כדי לשנות את משך המשימה"
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => beginResize(event, slot)}
                          onPointerMove={updateResize}
                          onPointerUp={finishResize}
                          onPointerCancel={cancelResize}
                          onDragStart={(event) => event.preventDefault()}
                        >
                          <GripHorizontal size={13} />
                        </span>
                      </button>
                    );
                  })}

                  {draggingSlotStart !== null
                    ? visibleHours.map((hour, index) => (
                        <div
                          key={`drop-${hour}`}
                          className={`pointer-events-none absolute left-0 right-14 z-30 flex items-center justify-center rounded-lg border-2 border-dashed transition ${
                            dropHour === hour
                              ? "border-violet-500 bg-violet-100/90 text-violet-700 dark:bg-violet-950/90 dark:text-violet-200"
                              : "border-transparent bg-white/20 text-transparent dark:bg-black/10"
                          }`}
                          style={{
                            top: DailyPlannerTimeline.hourTop(index, 2),
                            height: DailyPlannerTimeline.hourHeight(4),
                          }}
                        >
                          <span className="rounded-full bg-white/90 px-3 py-1 text-[0.6875rem] font-extrabold shadow-sm dark:bg-slate-900/90">
                            העבר ל־{formatHourLabel(hour)}
                          </span>
                        </div>
                      ))
                    : null}
                </div>
              )}

              <AnimatePresence>
                {editorStart !== null ? (
                  <>
                    <motion.button
                      type="button"
                      aria-label="סגור עריכה"
                      className="fixed inset-0 z-30 bg-slate-950/45"
                      onClick={closeEditor}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                    <motion.div
                      className="fixed bottom-0 left-0 z-40 flex max-h-[82dvh] flex-col rounded-t-3xl bg-white shadow-[0_-18px_50px_rgba(15,23,42,0.25)] dark:bg-[#171a24]"
                      style={{ width: "min(calc(480px * var(--app-font-scale, 1)), 100vw)" }}
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "tween", duration: 0.22 }}
                    >
                      <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <div className="flex items-center gap-3 px-4 pb-3 pt-3">
                        <div className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-100 px-3 text-[0.8125rem] font-extrabold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                          <Clock3 size={15} />
                          {formatSlotTimeLabel(editorStart)}
                        </div>
                        <h3 className="min-w-0 flex-1 text-[0.9375rem] font-extrabold text-text-primary">
                          {editingSlotStart === null ? "הוספת משימה" : "עריכת משימה"}
                        </h3>
                        <button
                          type="button"
                          onClick={closeEditor}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                          aria-label="סגירה"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="mx-4 rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                        <p className="mb-2 text-center text-[0.6875rem] font-bold text-text-muted">כמה זמן?</p>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            type="button"
                            onClick={() => changeDuration(-1)}
                            disabled={draftDuration <= MIN_DAILY_PLAN_TASK_DURATION}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-primary shadow-sm disabled:opacity-30 dark:bg-slate-900"
                            aria-label="קצר משך"
                          >
                            <Minus size={18} />
                          </button>
                          <div className="min-w-24 text-center">
                            <p className="text-[1.25rem] font-black text-text-primary">
                              {slotMinutesLabel(draftDuration)}
                            </p>
                            <p className="text-[0.625rem] font-semibold text-text-muted">
                              עד {formatSlotTimeLabel(editorStart + draftDuration)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => changeDuration(1)}
                            disabled={draftDuration >= maxDraftDuration}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-primary shadow-sm disabled:opacity-30 dark:bg-slate-900"
                            aria-label="הארך משך"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                          {DAILY_PLAN_TASK_DURATION_OPTIONS.filter(
                            (duration) => duration <= maxDraftDuration,
                          ).map((duration) => (
                            <button
                              key={duration}
                              type="button"
                              onClick={() => setDraftDuration(duration)}
                              className={`rounded-full px-2.5 py-1 text-[0.625rem] font-bold ${
                                draftDuration === duration
                                  ? "bg-violet-600 text-white"
                                  : "bg-white text-text-secondary dark:bg-slate-900"
                              }`}
                            >
                              {slotMinutesLabel(duration)}
                            </button>
                          ))}
                        </div>
                        <label className="mt-3 flex items-center justify-center gap-2 border-t border-slate-200 pt-3 text-[0.6875rem] font-bold text-text-muted dark:border-slate-700">
                          משך מדויק
                          <input
                            type="number"
                            min={MIN_DAILY_PLAN_TASK_DURATION}
                            max={maxDraftDuration}
                            step={1}
                            value={draftDuration}
                            onFocus={(event) => event.currentTarget.select()}
                            onChange={(event) => setExactDuration(event.target.value)}
                            className="h-8 w-20 rounded-lg border-0 bg-white px-2 text-center text-[0.8125rem] font-extrabold tabular-nums text-text-primary outline-none ring-violet-400 focus:ring-2 dark:bg-slate-900"
                            aria-label="משך מדויק בדקות"
                          />
                          דקות
                        </label>
                      </div>

                      <div className="px-4 pb-2 pt-3">
                        <div className="relative">
                          <Search
                            size={15}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                          />
                          <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="חיפוש משימה"
                            className="w-full rounded-xl border-0 bg-slate-100 py-2.5 pe-9 ps-3 text-[0.8125rem] outline-none ring-violet-400 focus:ring-2 dark:bg-slate-800"
                          />
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
                        {availableTasks.length === 0 ? (
                          <p className="my-4 rounded-xl bg-slate-100 px-4 py-6 text-center text-[0.75rem] font-semibold text-text-muted dark:bg-slate-800">
                            אין משימות פנויות
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {availableTaskGroups.map((group) => {
                              const expanded =
                                taskSearchActive || expandedTaskGroups.has(group.key);
                              return (
                                <section
                                  key={group.key}
                                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/60"
                                >
                                  <button
                                    type="button"
                                    aria-expanded={expanded}
                                    onClick={() => {
                                      if (taskSearchActive) return;
                                      setExpandedTaskGroups((current) => {
                                        const next = new Set(current);
                                        if (next.has(group.key)) next.delete(group.key);
                                        else next.add(group.key);
                                        return next;
                                      });
                                    }}
                                    className={`flex w-full items-center gap-2 bg-slate-100/90 px-3 py-2 text-right transition-colors hover:bg-violet-50 dark:bg-slate-800/90 dark:hover:bg-violet-950/40 ${
                                      expanded
                                        ? "border-b border-slate-200 dark:border-slate-700"
                                        : ""
                                    }`}
                                  >
                                    <FolderKanban
                                      size={14}
                                      className="shrink-0 text-violet-600 dark:text-violet-300"
                                    />
                                    <h4 className="min-w-0 flex-1 truncate text-[0.75rem] font-extrabold text-text-primary">
                                      {group.name}
                                    </h4>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[0.625rem] font-bold text-text-muted dark:bg-slate-900">
                                      {group.tasks.length}
                                    </span>
                                    <motion.span
                                      className="inline-flex shrink-0 text-text-muted"
                                      animate={{ rotate: expanded ? 180 : 0 }}
                                      transition={{ type: "spring", stiffness: 380, damping: 24 }}
                                    >
                                      <ChevronDown size={14} />
                                    </motion.span>
                                  </button>
                                  <AnimatePresence initial={false}>
                                    {expanded ? (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                                        className="overflow-hidden"
                                      >
                                        <div className="space-y-1 p-1.5">
                                          {group.tasks.map((task, index) => {
                                            const selected = task.id === draftTaskId;
                                            return (
                                              <motion.button
                                                key={task.id}
                                                type="button"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                  duration: 0.16,
                                                  delay: Math.min(index * 0.025, 0.15),
                                                }}
                                                onClick={() => setDraftTaskId(task.id)}
                                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right ${
                                                  selected
                                                    ? "bg-violet-100 ring-2 ring-violet-500 dark:bg-violet-950"
                                                    : "bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                                                }`}
                                              >
                                                <span
                                                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                                    task.priority === "high"
                                                      ? "bg-rose-500"
                                                      : task.priority === "medium"
                                                        ? "bg-amber-500"
                                                        : "bg-emerald-500"
                                                  }`}
                                                />
                                                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-bold text-text-primary">
                                                  {task.title}
                                                </span>
                                                <span
                                                  className={`h-5 w-5 shrink-0 rounded-full ${
                                                    selected
                                                      ? "border-[5px] border-violet-600 bg-white"
                                                      : "border-2 border-slate-300 dark:border-slate-600"
                                                  }`}
                                                />
                                              </motion.button>
                                            );
                                          })}
                                        </div>
                                      </motion.div>
                                    ) : null}
                                  </AnimatePresence>
                                </section>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                        {editingSlotStart !== null ? (
                          <button
                            type="button"
                            onClick={() => void removeTask()}
                            disabled={saving}
                            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 disabled:opacity-40 dark:bg-rose-950 dark:text-rose-300"
                            aria-label="הסר משימה"
                          >
                            <Trash2 size={17} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void saveTask()}
                          disabled={!draftTaskId || saving}
                          className="h-12 min-w-0 flex-1 rounded-xl bg-violet-600 text-[0.875rem] font-extrabold text-white shadow-lg shadow-violet-600/20 disabled:opacity-40 disabled:shadow-none"
                        >
                          {saving ? "שומר…" : editingSlotStart === null ? "הוסף ליומן" : "שמור שינויים"}
                        </button>
                      </div>
                    </motion.div>
                  </>
                ) : null}
              </AnimatePresence>
            </section>

            {error ? (
              <p className="shrink-0 border-t border-rose-200 bg-rose-50 px-4 py-2.5 text-[0.75rem] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
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
