"use client";

import { motion } from "framer-motion";
import { format, isToday, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarDays, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CalendarTaskChip } from "@/components/upcoming/calendar-task-chip";
import { TaskCard } from "@/components/task-card";
import Stack from "@/components/ui/stack";
import { domainKeyFromName, domainKeys, domainMeta, DomainKey } from "@/lib/ui/domains";
import {
  buildCalendarCells,
  dueDateToDayKey,
  isFullMonthRange,
} from "@/lib/dates/task-date-range";
import { TaskWithRelations } from "@/types/models";

interface UpcomingTasksCalendarProps {
  rangeStartIso: string;
  rangeEndIso: string;
  tasks: TaskWithRelations[];
  activeDomains: Set<DomainKey | "all">;
  onTaskClick: (task: { id: string; title: string }) => void;
}

const weekdayLabels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function taskDayKey(task: TaskWithRelations): string | null {
  return dueDateToDayKey(task.due_date);
}

export function UpcomingTasksCalendar({
  rangeStartIso,
  rangeEndIso,
  tasks,
  activeDomains,
  onTaskClick,
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

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const task of filteredTasks) {
      const key = taskDayKey(task);
      if (!key) continue;
      const bucket = map.get(key) ?? [];
      bucket.push(task);
      map.set(key, bucket);
    }
    return map;
  }, [filteredTasks]);

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
    <div className="overflow-hidden rounded-3xl border border-border-weak bg-gradient-to-bl from-surface-1/95 via-surface-1/80 to-surface-2/60 shadow-[0_24px_60px_rgba(2,6,23,0.18)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden border-b border-border-weak/80 bg-gradient-to-l from-accent-primary/20 via-accent-secondary/10 to-accent-cyan/15 px-5 py-5 sm:px-6"
      >
        <div className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-accent-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-0 h-36 w-36 rounded-full bg-accent-cyan/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-surface-1/50 text-accent-primary shadow-[0_8px_24px_rgba(79,70,229,0.25)] backdrop-blur-sm">
              <CalendarDays size={22} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent-primary">לוח משימות</p>
              <h2 className="text-xl font-bold text-text-primary sm:text-2xl">{monthTitle}</h2>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-weak bg-surface-1/70 px-3 py-1.5 text-xs font-semibold text-text-secondary backdrop-blur-sm">
            <Sparkles size={14} className="text-accent-secondary" />
            {filteredTasks.length} משימות בטווח
          </span>
        </div>
      </motion.div>

      <div className="flex flex-col gap-5 p-4 sm:p-5 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="upcoming-calendar-scroll rounded-2xl border border-border-weak/70 bg-surface-1/40 p-2 sm:p-3">
            <div className="upcoming-calendar-inner">
              <div className="upcoming-calendar-grid mb-0.5">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="py-1.5 text-center text-[11px] font-bold text-text-muted sm:text-xs"
                  >
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
                        className="min-h-[72px] rounded-xl border border-transparent bg-transparent sm:min-h-[96px]"
                        aria-hidden
                      />
                    );
                  }

                  const { date, key, inRange } = cell;
                  const dayTasks = inRange ? (tasksByDay.get(key) ?? []) : [];
                  const today = isToday(date);
                  const selected = selectedDay === key;

                  const handleSelect = () => {
                    if (inRange) setSelectedDay(key);
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
                      className={`flex min-h-[72px] flex-col rounded-xl border p-1.5 text-start transition duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 sm:min-h-[96px] sm:p-2 ${
                        !inRange
                          ? "cursor-default border-transparent bg-surface-2/20 opacity-45"
                          : selected
                            ? "cursor-pointer border-accent-primary/70 bg-gradient-to-bl from-accent-primary/20 to-accent-cyan/10 shadow-[0_0_20px_rgba(91,140,255,0.22)] ring-2 ring-accent-primary/30"
                            : "cursor-pointer border-border-weak/60 bg-surface-1/50 hover:border-accent-primary/40 hover:bg-surface-1/80"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-0.5">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold sm:h-7 sm:w-7 sm:text-xs ${
                            today
                              ? "ring-1 ring-accent-primary/60 bg-surface-1 text-accent-primary"
                              : "bg-surface-1/90 text-text-primary"
                          }`}
                        >
                          {format(date, "d")}
                        </span>
                        {dayTasks.length > 0 ? (
                          <span className="rounded-full bg-accent-primary/15 px-1 py-0.5 text-[9px] font-bold text-accent-primary sm:text-[10px]">
                            {dayTasks.length}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        {dayTasks.slice(0, 2).map((task) => (
                          <CalendarTaskChip
                            key={task.id}
                            task={task}
                            onClick={() => onTaskClick({ id: task.id, title: task.title })}
                          />
                        ))}
                        {dayTasks.length > 2 ? (
                          <span className="truncate px-0.5 text-[9px] font-semibold text-text-muted sm:text-[10px]">
                            +{dayTasks.length - 2}
                          </span>
                        ) : null}
                      </div>

                      {dayTasks.length > 0 ? (
                        <div className="mt-auto flex gap-0.5 pt-0.5">
                          {(() => {
                            const segments: string[] = [];
                            for (const domainKey of domainKeys) {
                              const count = dayTasks.filter(
                                (task) => domainKeyFromName(task.domain_name) === domainKey,
                              ).length;
                              if (count > 0) segments.push(domainMeta[domainKey].calendarAccent);
                            }
                            const otherCount = dayTasks.filter(
                              (task) => domainKeyFromName(task.domain_name) === null,
                            ).length;
                            if (otherCount > 0) segments.push("bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.45)]");
                            return segments.map((cls, idx) => (
                              <span key={`${cls}-${idx}`} className={`h-0.5 flex-1 rounded-full ${cls}`} />
                            ));
                          })()}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="w-full shrink-0 rounded-2xl border border-border-weak bg-surface-1/70 p-3 backdrop-blur-sm md:w-56 lg:w-60 xl:w-64">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="truncate text-xs font-bold text-text-primary">
              {selectedDate
                ? format(selectedDate, "EEEE, d בMMMM", { locale: he })
                : "בחרו יום בלוח"}
            </h3>
            {selectedTasks.length > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-weak bg-surface-2/70 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                <Sparkles size={10} className="text-accent-secondary" />
                {selectedTasks.length}
              </span>
            ) : null}
          </div>

          {!selectedDate ? (
            <p className="rounded-xl border border-dashed border-border-weak bg-surface-2/40 px-3 py-3 text-xs text-text-secondary">
              לחצו על יום בלוח כדי לראות את משימות אותו יום.
            </p>
          ) : selectedTasks.length === 0 ? (
            <p className="rounded-xl border border-border-weak bg-surface-2/40 px-3 py-3 text-xs text-text-secondary">
              אין משימות ביום זה.
            </p>
          ) : (
            <>
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
              {selectedTasks.length > 1 ? (
                <p className="mt-3 text-center text-[10px] text-text-muted">
                  גררו להעברת כרטיס לסוף הערימה
                </p>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
