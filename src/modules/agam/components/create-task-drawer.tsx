"use client";

import { useEffect, useMemo, useState } from "react";
import { ListTodo, Plus } from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCandidate, AgamCycle } from "@/modules/agam/types";

export function CreateAgamTaskDrawer({
  hideTrigger = false,
  open: openProp,
  onOpenChange,
  onCreated,
  cycleId: fixedCycleId = null,
  candidateId: fixedCandidateId = null,
  cycleName,
  candidateName,
  requireCycle = false,
  triggerClassName,
  triggerLabel = "הוספת משימה",
}: {
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
  cycleId?: string | null;
  candidateId?: string | null;
  cycleName?: string | null;
  candidateName?: string | null;
  /** When true (dashboard), cycle must be selected */
  requireCycle?: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [cycleId, setCycleId] = useState(fixedCycleId ?? "");
  const [candidateId, setCandidateId] = useState(fixedCandidateId ?? "");
  const [cycles, setCycles] = useState<AgamCycle[]>([]);
  const [candidates, setCandidates] = useState<AgamCandidate[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCycleId(fixedCycleId ?? "");
    setCandidateId(fixedCandidateId ?? "");
    void Promise.all([
      fixedCycleId
        ? Promise.resolve({ cycles: [] as AgamCycle[] })
        : agamFetch<{ cycles: AgamCycle[] }>("/api/agam/cycles").catch(() => ({ cycles: [] })),
      fixedCandidateId
        ? Promise.resolve({ candidates: [] as AgamCandidate[] })
        : agamFetch<{ candidates: AgamCandidate[] }>("/api/agam/candidates").catch(() => ({
            candidates: [],
          })),
    ]).then(([cyclesData, candidatesData]) => {
      setCycles(cyclesData.cycles ?? []);
      setCandidates(candidatesData.candidates ?? []);
    });
  }, [open, fixedCycleId, fixedCandidateId]);

  const candidatesForCycle = useMemo(() => {
    if (!cycleId) return candidates;
    return candidates.filter((row) => row.cycle_id === cycleId);
  }, [candidates, cycleId]);

  const subtitle = [
    cycleName ? `מחזור: ${cycleName}` : null,
    candidateName ? `מועמד: ${candidateName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const canSubmit =
    title.trim().length >= 2 && (!requireCycle || Boolean(cycleId || fixedCycleId));

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await agamFetch("/api/agam/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          dueDate: dueDate || null,
          cycleId: (fixedCycleId || cycleId || null) as string | null,
          candidateId: (fixedCandidateId || candidateId || null) as string | null,
        }),
      });
      toast.success("המשימה נוספה לנושא קצינים");
      setTitle("");
      setDueDate("");
      if (!fixedCycleId) setCycleId("");
      if (!fixedCandidateId) setCandidateId("");
      setOpen(false);
      onCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "יצירת משימה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          className={triggerClassName ?? primaryButtonClass}
          onClick={() => setOpen(true)}
        >
          <Plus size={16} />
          {triggerLabel}
        </button>
      ) : null}

      <Drawer open={open} onClose={() => setOpen(false)} title="הוספת משימה" subtitle={subtitle || "נושא: קצינים"}>
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-text-muted">כותרת</span>
            <input
              className={fieldClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="מה צריך לעשות?"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-text-muted">תאריך יעד</span>
            <input
              type="date"
              className={fieldClass}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              dir="ltr"
            />
          </label>

          {!fixedCycleId ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-text-muted">
                מחזור{requireCycle ? " *" : ""}
              </span>
              <select
                className={fieldClass}
                value={cycleId}
                onChange={(event) => {
                  setCycleId(event.target.value);
                  setCandidateId("");
                }}
              >
                <option value="">{requireCycle ? "בחרו מחזור" : "ללא מחזור"}</option>
                {cycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {!fixedCandidateId ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-text-muted">מועמד (אופציונלי)</span>
              <select
                className={fieldClass}
                value={candidateId}
                onChange={(event) => setCandidateId(event.target.value)}
              >
                <option value="">ללא מועמד</option>
                {candidatesForCycle.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.full_name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="ui-card flex items-center gap-2 rounded-xl bg-surface-2/80 px-3.5 py-3 text-xs text-text-muted">
            <ListTodo size={14} className="shrink-0 text-text-primary" />
            המשימה תופיע באפליקציית המשימות תחת נושא קצינים.
          </div>

          <div className="ui-divider-top flex justify-end gap-2 pt-4">
            <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)}>
              ביטול
            </button>
            <button
              type="button"
              className={primaryButtonClass}
              disabled={saving || !canSubmit}
              onClick={() => void submit()}
            >
              {saving ? "שומר…" : "יצירת משימה"}
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
