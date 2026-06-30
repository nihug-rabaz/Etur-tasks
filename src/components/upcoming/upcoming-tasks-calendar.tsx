"use client";

import { motion } from "framer-motion";
import { format, isToday, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarClock, CalendarDays, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CalendarScheduleChip } from "@/components/upcoming/calendar-schedule-chip";
import { CalendarTaskChip } from "@/components/upcoming/calendar-task-chip";
import { TaskCard } from "@/components/task-card";
import Stack from "@/components/ui/stack";
import { scheduleEventDayKeys, formatScheduleTime } from "@/lib/dates/schedule-range";
import {
  buildCalendarCells,
  dueDateToDayKey,
  isFullMonthRange,
} from "@/lib/dates/task-date-range";
import { domainKeyFromName, domainKeys, domainMeta, DomainKey } from "@/lib/ui/domains";
import { CalendarEventWithRelations, TaskWithRelations } from "@/types/models";

interface UpcomingTasksCalendarProps {
  rangeStartIso: string;
  rangeEndIso: string;
  tasks: TaskWithRelations[];
  events: CalendarEventWithRelations[];
  activeDomains: Set<DomainKey | "all">;
  onTaskClick: (task: { id: string; title: string }) => void;
  onScheduleClick: (event: { id: string; title: string }) => void;
  onSelectedDayChange?: (dayKey: string | null) => void;
}

const weekdayLabels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function pickDayChips(dayTasks: TaskWithRelations[], dayEvents: CalendarEventWithRelations[]) {
  if (dayTasks.length > 0 && dayEvents.length > 0) {
    return { tasks: dayTasks.slice(0, 1), events: dayEvents.slice(0, 1) };
  }
  return { tasks: dayTasks.slice(0, 2), events: dayEvents.slice(0, 2 - Math.min(2, dayTasks.length)) };
}

export function UpcomingTasksCalendar({
  rangeStartIso,
  rangeEndIso,
  tasks,
  events,
  activeDomains,
  onTaskClick,
  onScheduleClick,
  onSelectedDayChange,
}: UpcomingTasksCalendarProps) {
  const rangeStart = parseISO(rangeStartIso);
  const rangeEnd = parseISO(rangeEndIso);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    if (activeDomains.has("all")) return tasks;
    return tasks.filter((task) => {
      const key = domainKeyFromName(task.domain_name);
      return key ? activeDomains.has(key) : false;
    });
  }, [tasks, activeDomains]);

  const filteredEvents = useMemo(() => {
    if (activeDomains.has("all")) return events;
    return events.filter((event) => {
      const key = domainKeyFromName(event.domain_name);
      return key ? activeDomains.has(key) : false;
    });
  }, [events, activeDomains]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const task of filteredTasks) {
      const key = dueDateToDayKey(task.due_date);
      if (!key) continue;
      const bucket = map.get(key) ?? [];
      bucket.push(task);
      map.set(key, bucket);
    }
    return map;
  }, [filteredTasks]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventWithRelations[]>();
    for (const event of filteredEvents) {
      for (const key of scheduleEventDayKeys(event)) {
        const bucket = map.get(key) ?? [];
        bucket.push(event);
        map.set(key, bucket);
      }
    }
    return map;
  }, [filteredEvents]);

  const calendarCells = useMemo(
    () => buildCalendarCells(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  const inRangeDayKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const cell of calendarCells) {
      if (cell.type === "day" && cell.inRange) keys.add(cell.key);
    }
    return keys;
  }, [calendarCells]);

  const selectedDate = selectedDay ? parseISO(selectedDay) : null;
  const selectedTasks = selectedDay ? (tasksByDay.get(selectedDay) ?? []) : [];
  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

  useEffect(() => {
    setSelectedDay((current) => {
      if (current && inRangeDayKeys.has(current)) return current;
      return null;
    });
  }, [inRangeDayKeys]);

  const monthTitle = isFullMonthRange(rangeStart, rangeEnd)
    ? format(rangeStart, "MMMM yyyy", { locale: he })
    : `${format(rangeStart, "d בMMMM", { locale: he })} – ${format(rangeEnd, "d בMMMM yyyy", { locale: he })}`;

  return (
    <div className="surface-card overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-surface-2/50 px-5 py-5 sm:px-6"
      >
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border-weak bg-surface-1 text-accent-primary">
              <CalendarDays size={22} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent-primary">לוח זמנים</p>
              <h2 className="text-xl font-bold text-text-primary sm:text-2xl">{monthTitle}</h2>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-weak bg-surface-1/70 px-3 py-1.5 text-xs font-semibold text-text-secondary backdrop-blur-sm">
            <Sparkles size={14} className="text-accent-secondary" />
            {filteredTasks.length} משימות · {filteredEvents.length} לו״זים
          </span>
        </div>
      </motion.div>

      <div className="flex flex-col gap-5 p-4 sm:p-5 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="upcoming-calendar-scroll rounded-2xl bg-surface-2/30 p-2 sm:p-3">
            <div className="upcoming-calendar-inner">
              <div className="upcoming-calendar-grid mb-0.5">
                {weekdayLabels.map((label) => (
                  <div key={label} className="py-1.5 text-center text-[11px] font-bold text-text-muted sm:text-xs">
                    {label}
                  </div>
                ))}
              </div>

              <div className="upcoming-calendar-grid">
                {calendarCells.map((cell, index) => {
                  if (cell.type === "empty") {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[72px] rounded-2xl border border-transparent bg-transparent sm:min-h-[96px]"
                        aria-hidden
                      />
                    );
                  }

                  const { date, key, inRange } = cell;
                  const dayTasks = inRange ? (tasksByDay.get(key) ?? []) : [];
                  const dayEvents = inRange ? (eventsByDay.get(key) ?? []) : [];
                  const chips = pickDayChips(dayTasks, dayEvents);
                  const dayCount = dayTasks.length + dayEvents.length;
                  const today = isToday(date);
                  const selected = selectedDay === key;

                  const handleSelect = () => {
                    if (!inRange) return;
                    setSelectedDay(key);
                    onSelectedDayChange?.(key);
                  };

                  return (
                    <div
                      key={key}
                      role={inRange ? "button" : undefined}
                      tabIndex={inRange ? 0 : -1}
                      aria-disabled={!inRange}
                      onClick={handleSelect}
                      onKeyDown={(event) => {
                        if (!inRange) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelect();
                        }
                      }}
                      className={`flex min-h-[72px] flex-col rounded-2xl p-2 text-start transition duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 sm:min-h-[96px] sm:p-2.5 ${
                        !inRange
                          ? "cursor-default bg-surface-2/20 opacity-45"
                          : selected
                            ? "cursor-pointer bg-accent-primary/10 ring-2 ring-accent-primary/30"
                            : "cursor-pointer bg-surface-2/50 hover:bg-surface-2"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-0.5">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold sm:h-7 sm:w-7 sm:text-xs ${
                            today
                              ? "bg-surface-1 text-accent-primary ring-1 ring-accent-primary/60"
                              : "bg-surface-1/90 text-text-primary"
                          }`}
                        >
                          {format(date, "d")}
                        </span>
                        {dayCount > 0 ? (
                          <span className="rounded-full bg-accent-primary/15 px-1 py-0.5 text-[9px] font-bold text-accent-primary sm:text-[10px]">
                            {dayCount}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        {chips.tasks.map((task) => (
                          <CalendarTaskChip
                            key={task.id}
                            task={task}
                            onClick={() => onTaskClick({ id: task.id, title: task.title })}
                          />
                        ))}
                        {chips.events.map((event) => (
                          <CalendarScheduleChip
                            key={event.id}
                            title={event.title}
                            onClick={() => onScheduleClick({ id: event.id, title: event.title })}
                          />
                        ))}
                        {dayCount > chips.tasks.length + chips.events.length ? (
                          <span className="truncate px-0.5 text-[9px] font-semibold text-text-muted sm:text-[10px]">
                            +{dayCount - chips.tasks.length - chips.events.length}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="w-full shrink-0 rounded-2xl bg-surface-2/40 p-3 md:w-56 lg:w-60 xl:w-64">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="truncate text-xs font-bold text-text-primary">
              {selectedDate
                ? format(selectedDate, "EEEE, d בMMMM", { locale: he })
                : "בחרו יום בלוח"}
            </h3>
            {selectedTasks.length + selectedEvents.length > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-weak bg-surface-2/70 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                <Sparkles size={10} className="text-accent-secondary" />
                {selectedTasks.length + selectedEvents.length}
              </span>
            ) : null}
          </div>

          {!selectedDate ? (
            <p className="rounded-xl border border-dashed border-border-weak bg-surface-2/40 px-3 py-3 text-xs text-text-secondary">
              לחצו על יום בלוח כדי לראות משימות ולו״זים.
            </p>
          ) : selectedTasks.length === 0 && selectedEvents.length === 0 ? (
            <p className="rounded-xl border border-border-weak bg-surface-2/40 px-3 py-3 text-xs text-text-secondary">
              אין פריטים ביום זה.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onScheduleClick({ id: event.id, title: event.title })}
                  className="block w-full rounded-xl border border-violet-400/40 bg-violet-500/10 p-3 text-start transition hover:bg-violet-500/15"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">לו״ז</p>
                  <p className="mt-1 text-sm font-bold text-text-primary">{event.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                    <CalendarClock size={12} />
                    {formatScheduleTime(event)}
                  </p>
                </button>
              ))}
              {selectedTasks.length > 0 ? (
                <div className="mx-auto" style={{ width: "100%", maxWidth: "14rem", height: "16rem" }}>
                  <Stack
                    key={selectedDay ?? "none"}
                    cards={[...selectedTasks].reverse().map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onTaskClick({ id: task.id, title: task.title })}
                        className="block h-full w-full text-start [&>article]:flex [&>article]:h-full [&>article]:flex-col [&>article>div:nth-of-type(2)]:flex-1"
                      >
                        <TaskCard task={task} />
                      </button>
                    ))}
                    randomRotation
                    sensitivity={110}
                    animationConfig={{ stiffness: 280, damping: 22 }}
                  />
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
