import { Suspense } from "react";
import { UpcomingTasksShell } from "@/components/upcoming/upcoming-tasks-shell";
import {
  dayBoundsForQuery,
  resolveTaskDateRange,
  toDateQueryValue,
} from "@/lib/dates/task-date-range";
import { AuthorizationService } from "@/services/authorization.service";
import { CalendarEventService } from "@/services/calendar-event.service";
import { TaskService } from "@/services/task.service";
import { serializeCalendarEventDates } from "@/lib/dates/schedule-range";

interface UpcomingTasksPageProps {
  searchParams: Promise<{ from?: string; to?: string; week?: string; month?: string }>;
}

export default async function UpcomingTasksPage({ searchParams }: UpcomingTasksPageProps) {
  const filters = await searchParams;
  const { start, end } = resolveTaskDateRange(
    filters.from,
    filters.to,
    filters.week,
    filters.month,
  );
  const bounds = dayBoundsForQuery(start, end);

  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.ensureApproved();
  const access = await authorizationService.getTaskAccessContext(profile);
  const taskService = new TaskService();
  const calendarEventService = new CalendarEventService();
  const [tasks, events] = await Promise.all([
    taskService.getTasksDueInRange(access, bounds.start, bounds.end),
    calendarEventService.getEventsInRange(access, bounds.start, bounds.end),
  ]);
  const serializedEvents = events.map(serializeCalendarEventDates);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-secondary">טוען לוח זמנים…</div>}>
      <UpcomingTasksShell
        rangeStartIso={start.toISOString()}
        rangeEndIso={end.toISOString()}
        fromQueryValue={toDateQueryValue(start)}
        toQueryValue={toDateQueryValue(end)}
        tasks={tasks}
        events={serializedEvents}
      />
    </Suspense>
  );
}
