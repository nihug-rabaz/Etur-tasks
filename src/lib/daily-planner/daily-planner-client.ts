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

interface DailyPlannerCacheEntry {
  snapshot: DailyPlannerSnapshot;
  storedAt: number;
}

export class DailyPlannerClient {
  private static readonly snapshots = new Map<string, DailyPlannerCacheEntry>();
  private static readonly requests = new Map<string, Promise<DailyPlannerSnapshot>>();

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
