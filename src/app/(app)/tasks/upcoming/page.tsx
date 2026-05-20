import { UpcomingTasksShell } from "@/components/upcoming/upcoming-tasks-shell";
import {
  dayBoundsForQuery,
  resolveTaskDateRange,
  toDateQueryValue,
} from "@/lib/dates/task-date-range";
import { TaskService } from "@/services/task.service";

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

  const taskService = new TaskService();
  const tasks = await taskService.getTasksDueInRange(bounds.start, bounds.end);

  return (
    <UpcomingTasksShell
      rangeStartIso={start.toISOString()}
      rangeEndIso={end.toISOString()}
      fromQueryValue={toDateQueryValue(start)}
      toQueryValue={toDateQueryValue(end)}
      tasks={tasks}
    />
  );
}
