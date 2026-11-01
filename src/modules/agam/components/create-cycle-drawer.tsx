"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { TimelineDatePicker } from "@/modules/agam/components/timeline-date-picker";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCycle } from "@/modules/agam/types";

export function CreateCycleDrawer({
  open,
  onOpenChange,
  onCreated,
  defaultCohortYear = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (cycle: AgamCycle) => void;
  defaultCohortYear?: string;
}) {
  const [name, setName] = useState("");
  const [cycleDate, setCycleDate] = useState("");
  const [cohortYear, setCohortYear] = useState(defaultCohortYear);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setCohortYear(defaultCohortYear);
  }, [open, defaultCohortYear]);

  const submit = async () => {
    setSaving(true);
    try {
      const data = await agamFetch<{ cycle: AgamCycle }>("/api/agam/cycles", {
        method: "POST",
        body: JSON.stringify({
          name,
          cycleDate,
          cohortYear: cohortYear ? Number(cohortYear) : null,
          notes: notes || null,
        }),
      });
      toast.success("המחזור נוצר");
      onOpenChange(false);
      setName("");
      setCycleDate("");
      setCohortYear(defaultCohortYear);
      setNotes("");
      onCreated?.(data.cycle);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "יצירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title="מחזור חדש" subtitle="שם, תאריך ושנתון">
      <div className="space-y-4">
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          שם המחזור
          <input
            className={fieldClass}
            placeholder="לדוגמה: מחזור קיץ 2026"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <TimelineDatePicker value={cycleDate} onChange={setCycleDate} label="תאריך" />
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          שנתון
          <input
            type="number"
            dir="ltr"
            className={`${fieldClass} text-left`}
            placeholder="2026"
            value={cohortYear}
            onChange={(event) => setCohortYear(event.target.value)}
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
        <div className="ui-divider-top flex gap-2 pt-4">
          <button
            type="button"
            className={`${primaryButtonClass} flex-1`}
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
