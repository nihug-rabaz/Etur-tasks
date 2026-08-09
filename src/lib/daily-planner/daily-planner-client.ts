export interface DailyPlannerTask {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: "in_progress" | "completed";
  project_id?: string | null;
  project_name?: string | null;
}

export interface DailyPlannerSlot {
  start_minute: number;
  duration_minutes: number;
  task_id: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: "in_progress" | "completed";
  is_done?: boolean;
}

export interface DailyPlannerSnapshot {
  slots: DailyPlannerSlot[];
  tasks: DailyPlannerTask[];
  hourStart?: number;
  hourEnd?: number;
  slotMinutes?: number;
}

export interface DailyPlannerAssignment {
  planDate: string;
  startMinute: number;
  taskId: string;
  durationMinutes: number;
  previousStartMinute?: number;
}

export type TaskPlanPlacement = "bank" | "mine" | "other";

export const DAILY_PLAN_CHANGED_EVENT = "daily-plan-changed";

interface DailyPlannerCacheEntry {
  snapshot: DailyPlannerSnapshot;
  storedAt: number;
}

export class DailyPlannerClient {
  private static readonly snapshots = new Map<string, DailyPlannerCacheEntry>();
  private static readonly requests = new Map<string, Promise<DailyPlannerSnapshot>>();
  private static readonly placementCache = new Map<string, TaskPlanPlacement>();
  private static readonly placementQueues = new Map<string, Set<string>>();
  private static readonly placementWaiters = new Map<
    string,
    Array<(placement: TaskPlanPlacement) => void>
  >();
  private static readonly placementTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private static readonly placementFlushes = new Map<string, Promise<void>>();

  public static dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  public static getCached(planDate: string): DailyPlannerSnapshot | null {
    return this.snapshots.get(planDate)?.snapshot ?? null;
  }

  public static isFresh(planDate: string, maxAgeMs = 15_000): boolean {
    const entry = this.snapshots.get(planDate);
    return Boolean(entry && Date.now() - entry.storedAt < maxAgeMs);
  }

  public static async load(planDate: string, force = false): Promise<DailyPlannerSnapshot> {
    if (!force) {
      const cached = this.snapshots.get(planDate);
      if (cached) return cached.snapshot;

      const pending = this.requests.get(planDate);
      if (pending) return pending;
    }

    const startedAt = Date.now();
    const request = this.fetchSnapshot(planDate);
    this.requests.set(planDate, request);

    try {
      const snapshot = await request;
      const current = this.snapshots.get(planDate);
      if (current && current.storedAt > startedAt) {
        return current.snapshot;
      }
      this.snapshots.set(planDate, { snapshot, storedAt: Date.now() });
      return snapshot;
    } finally {
      if (this.requests.get(planDate) === request) {
        this.requests.delete(planDate);
      }
    }
  }

  public static preload(planDate: string): void {
    void this.load(planDate).catch(() => undefined);
  }

  public static updateSlots(planDate: string, slots: DailyPlannerSlot[]): void {
    const entry = this.snapshots.get(planDate);
    if (!entry) return;
    this.snapshots.set(planDate, {
      snapshot: { ...entry.snapshot, slots },
      storedAt: Date.now(),
    });
  }

  public static async assign(assignment: DailyPlannerAssignment): Promise<{
    startMinute: number;
    durationMinutes: number;
  }> {
    const response = await fetch("/api/daily-planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignment),
    });
    const data = (await response.json().catch(() => ({}))) as {
      startMinute?: number;
      durationMinutes?: number;
    };
    if (!response.ok || data.startMinute === undefined || data.durationMinutes === undefined) {
      throw new Error(response.status === 409 ? "TIME_CONFLICT" : "SAVE_FAILED");
    }
    return {
      startMinute: data.startMinute,
      durationMinutes: data.durationMinutes,
    };
  }

  public static async remove(planDate: string, startMinute: number): Promise<void> {
    const response = await fetch("/api/daily-planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planDate, startMinute, taskId: null }),
    });
    if (!response.ok) throw new Error("SAVE_FAILED");
  }

  public static async addToDayList(
    planDate: string,
    taskId: string,
  ): Promise<{ startMinute: number; durationMinutes: number }> {
    const response = await fetch("/api/daily-planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planDate, taskId, mode: "list", action: "add" }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      startMinute?: number;
      durationMinutes?: number;
    };
    if (!response.ok || data.startMinute === undefined || data.durationMinutes === undefined) {
      throw new Error(response.status === 409 ? "DAY_FULL" : "SAVE_FAILED");
    }
    this.invalidatePlacements(planDate, taskId);
    this.setCachedPlacement(planDate, taskId, "mine");
    this.notifyPlanChanged(planDate, taskId);
    return {
      startMinute: data.startMinute,
      durationMinutes: data.durationMinutes,
    };
  }

  public static async removeFromDayList(planDate: string, taskId: string): Promise<void> {
    const response = await fetch("/api/daily-planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planDate, taskId, mode: "list", action: "remove" }),
    });
    if (!response.ok) throw new Error("SAVE_FAILED");
    this.invalidatePlacements(planDate, taskId);
    this.notifyPlanChanged(planDate, taskId);
  }

  public static async setDone(planDate: string, taskId: string, isDone: boolean): Promise<void> {
    const response = await fetch("/api/daily-planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planDate,
        taskId,
        mode: "list",
        action: "setDone",
        isDone,
      }),
    });
    if (!response.ok) throw new Error("SAVE_FAILED");
  }

  public static notifyPlanChanged(planDate: string, taskId?: string): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent(DAILY_PLAN_CHANGED_EVENT, { detail: { planDate, taskId } }),
    );
  }

  public static invalidatePlacements(planDate?: string, taskId?: string): void {
    if (!planDate) {
      this.placementCache.clear();
      return;
    }
    if (taskId) {
      this.placementCache.delete(`${planDate}:${taskId}`);
      return;
    }
    for (const key of this.placementCache.keys()) {
      if (key.startsWith(`${planDate}:`)) this.placementCache.delete(key);
    }
  }

  public static setCachedPlacement(
    planDate: string,
    taskId: string,
    placement: TaskPlanPlacement,
  ): void {
    this.placementCache.set(`${planDate}:${taskId}`, placement);
  }

  /** Batch placement lookups so many task rows share one API call. */
  public static getPlacement(planDate: string, taskId: string): Promise<TaskPlanPlacement> {
    const cacheKey = `${planDate}:${taskId}`;
    const cached = this.placementCache.get(cacheKey);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
      const waiters = this.placementWaiters.get(cacheKey) ?? [];
      waiters.push(resolve);
      this.placementWaiters.set(cacheKey, waiters);

      const queue = this.placementQueues.get(planDate) ?? new Set<string>();
      queue.add(taskId);
      this.placementQueues.set(planDate, queue);

      if (!this.placementTimers.has(planDate)) {
        this.placementTimers.set(
          planDate,
          setTimeout(() => {
            this.placementTimers.delete(planDate);
            void this.flushPlacements(planDate);
          }, 24),
        );
      }
    });
  }

  private static async flushPlacements(planDate: string): Promise<void> {
    const existing = this.placementFlushes.get(planDate);
    if (existing) {
      await existing;
      const leftover = this.placementQueues.get(planDate);
      if (leftover && leftover.size > 0) {
        await this.flushPlacements(planDate);
      }
      return;
    }

    const queue = this.placementQueues.get(planDate);
    if (!queue || queue.size === 0) return;
    this.placementQueues.set(planDate, new Set());
    const ids = [...queue];

    const run = (async () => {
      try {
        const response = await fetch(
          `/api/daily-planner/placement?date=${encodeURIComponent(planDate)}&ids=${encodeURIComponent(ids.join(","))}`,
        );
        const data = (await response.json().catch(() => ({}))) as {
          placements?: Record<string, TaskPlanPlacement>;
        };
        const placements = response.ok && data.placements ? data.placements : {};
        for (const id of ids) {
          const placement = placements[id] ?? "bank";
          const cacheKey = `${planDate}:${id}`;
          this.placementCache.set(cacheKey, placement);
          const waiters = this.placementWaiters.get(cacheKey) ?? [];
          this.placementWaiters.delete(cacheKey);
          for (const resolve of waiters) resolve(placement);
        }
      } catch {
        for (const id of ids) {
          const cacheKey = `${planDate}:${id}`;
          const waiters = this.placementWaiters.get(cacheKey) ?? [];
          this.placementWaiters.delete(cacheKey);
          for (const resolve of waiters) resolve("bank");
        }
      }
    })();

    this.placementFlushes.set(planDate, run);
    try {
      await run;
    } finally {
      if (this.placementFlushes.get(planDate) === run) {
        this.placementFlushes.delete(planDate);
      }
    }

    const leftover = this.placementQueues.get(planDate);
    if (leftover && leftover.size > 0) {
      await this.flushPlacements(planDate);
    }
  }

  private static async fetchSnapshot(planDate: string): Promise<DailyPlannerSnapshot> {
    const response = await fetch(`/api/daily-planner?date=${encodeURIComponent(planDate)}`);
    const data = (await response.json().catch(() => ({}))) as Partial<DailyPlannerSnapshot>;
    if (!response.ok) {
      throw new Error("Daily planner load failed");
    }
    return {
      slots: Array.isArray(data.slots) ? data.slots : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      hourStart: data.hourStart,
      hourEnd: data.hourEnd,
      slotMinutes: data.slotMinutes,
    };
  }
}
