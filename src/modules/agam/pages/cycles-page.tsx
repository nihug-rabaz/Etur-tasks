"use client";

import Link from "next/link";
import { CalendarDays, Plus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCycle } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

function formatCycleDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AgamCyclesPage() {
  const [cycles, setCycles] = useState<AgamCycle[]>([]);
  const [role, setRole] = useState<ModuleRole | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await agamFetch<{ cycles: AgamCycle[]; role: ModuleRole }>("/api/agam/cycles");
      setCycles(data.cycles);
      setRole(data.role);
    } catch {
      toast.error("טעינת המחזורים נכשלה");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canEdit = role === "admin" || role === "ramad" || role === "user";

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary">מחזורי מועמדים</h1>
          <p className="mt-1 text-sm text-text-secondary">
            ניהול מחזורים לפי תאריך — יצירת מועמדים חדשים ושיוך מועמדים קיימים
          </p>
        </div>
        {canEdit ? (
          <button type="button" className={primaryButtonClass} onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            מחזור חדש
          </button>
        ) : null}
      </div>

      {cycles.length === 0 ? (
        <div className="dashboard-glass rounded-3xl p-10 text-center">
          <CalendarDays className="mx-auto text-accent-primary" size={36} />
          <p className="mt-4 text-lg font-extrabold text-text-primary">עדיין אין מחזורים</p>
          <p className="mt-2 text-sm text-text-muted">צרו מחזור ראשון כדי לקבץ מועמדים לפי מועד מיון.</p>
          {canEdit ? (
            <button type="button" className={`${primaryButtonClass} mt-5`} onClick={() => setCreateOpen(true)}>
              יצירת מחזור
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cycles.map((cycle) => (
            <Link
              key={cycle.id}
              href={`/agam/cycles/${cycle.id}`}
              className="dashboard-glass group flex flex-col rounded-3xl p-6 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-accent-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary/12 text-accent-primary">
                  <CalendarDays size={22} />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-text-secondary">
                  <Users size={13} />
                  {cycle.candidate_count ?? 0} מועמדים
                </span>
              </div>
              <h2 className="mt-4 text-xl font-extrabold text-text-primary group-hover:text-accent-primary">
                {cycle.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-text-secondary">
                {formatCycleDate(cycle.cycle_date)}
              </p>
              {cycle.notes ? (
                <p className="mt-3 line-clamp-2 text-xs text-text-muted">{cycle.notes}</p>
              ) : (
                <p className="mt-3 text-xs text-text-muted">ללא הערות</p>
              )}
              <span className="mt-5 text-xs font-bold text-accent-primary">כניסה למחזור →</span>
            </Link>
          ))}
        </div>
      )}

      <CreateCycleDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void load()}
      />
    </div>
  );
}

function CreateCycleDrawer({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [cycleDate, setCycleDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const data = await agamFetch<{ cycle: AgamCycle }>("/api/agam/cycles", {
        method: "POST",
        body: JSON.stringify({ name, cycleDate, notes: notes || null }),
      });
      toast.success("המחזור נוצר");
      onOpenChange(false);
      setName("");
      setCycleDate("");
      setNotes("");
      onCreated?.(data.cycle.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "יצירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title="מחזור חדש" subtitle="שם ותאריך המיון">
      <div className="space-y-4 p-1">
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          שם המחזור
          <input
            className={fieldClass}
            placeholder="לדוגמה: מחזור קיץ 2026"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          תאריך
          <input
            type="date"
            dir="ltr"
            className={`${fieldClass} text-left`}
            value={cycleDate}
            onChange={(event) => setCycleDate(event.target.value)}
          />
        </label>
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          הערות
          <textarea
            className={fieldClass}
            rows={3}
            placeholder="אופציונלי"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={saving || name.trim().length < 2 || !cycleDate}
            onClick={() => void submit()}
          >
            {saving ? "יוצר…" : "יצירת מחזור"}
          </button>
          <button type="button" className={secondaryButtonClass} onClick={() => onOpenChange(false)}>
            ביטול
          </button>
        </div>
      </div>
    </Drawer>
  );
}
