"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  GAP_STATUS_LABELS,
  GAP_STATUSES,
  MAX_POSITION_CANDIDATES,
  POSITION_DECISIONS,
  gapStatusTone,
} from "@/modules/nagadim/lib/decisions";
import {
  fieldClass,
  pageShellClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/nagadim/lib/ui";
import type { NagadimGapStatus, NagadimPositionWithCandidates } from "@/modules/nagadim/types";
import type { ModuleRole } from "@/shared/modules/types";

type Props = {
  title?: string;
  initialGapStatus?: NagadimGapStatus | "all";
  showStatusFilter?: boolean;
};

export function NagadimPositionsPage({
  title = "תקנים בפער",
  initialGapStatus = "all",
  showStatusFilter = false,
}: Props) {
  const [positions, setPositions] = useState<NagadimPositionWithCandidates[]>([]);
  const [role, setRole] = useState<ModuleRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NagadimGapStatus | "all">(initialGapStatus);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    command: "",
    division: "",
    brigade: "",
    unit: "",
    activity_level: "",
    notes: "",
  });
  const [slotForms, setSlotForms] = useState<
    Record<string, { full_name: string; decision: string; notes: string }>
  >({});

  const canEdit = role === "admin" || role === "user";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs =
        filter !== "all" ? `?gap_status=${encodeURIComponent(filter)}` : "";
      const response = await fetch(`/api/nagadim/positions${qs}`);
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as {
        positions: NagadimPositionWithCandidates[];
        role: ModuleRole;
      };
      setPositions(data.positions);
      setRole(data.role);
    } catch {
      toast.error("טעינת התקנים נכשלה");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setFilter(initialGapStatus);
  }, [initialGapStatus]);

  const createPosition = async () => {
    const response = await fetch("/api/nagadim/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: form.command || null,
        division: form.division || null,
        brigade: form.brigade || null,
        unit: form.unit || null,
        activity_level: form.activity_level || null,
        notes: form.notes || null,
        gap_status: "open",
      }),
    });
    if (!response.ok) {
      toast.error("יצירת תקן נכשלה");
      return;
    }
    setForm({
      command: "",
      division: "",
      brigade: "",
      unit: "",
      activity_level: "",
      notes: "",
    });
    toast.success("תקן נוסף");
    await load();
  };

  const setGapStatus = async (id: string, gap_status: NagadimGapStatus) => {
    const response = await fetch(`/api/nagadim/positions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gap_status }),
    });
    if (!response.ok) {
      toast.error("עדכון סטטוס נכשל");
      return;
    }
    await load();
  };

  const deletePosition = async (id: string) => {
    if (!confirm("למחוק תקן?")) return;
    const response = await fetch(`/api/nagadim/positions/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("מחיקה נכשלה");
      return;
    }
    toast.success("נמחק");
    await load();
  };

  const addSlot = async (positionId: string) => {
    const slot = slotForms[positionId] ?? { full_name: "", decision: "", notes: "" };
    if (!slot.full_name.trim()) return;
    const response = await fetch(`/api/nagadim/positions/${positionId}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: slot.full_name.trim(),
        decision: slot.decision || null,
        notes: slot.notes || null,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(data.error || "הוספת מועמד נכשלה");
      return;
    }
    setSlotForms((prev) => ({
      ...prev,
      [positionId]: { full_name: "", decision: "", notes: "" },
    }));
    await load();
  };

  const patchSlotDecision = async (
    positionId: string,
    slotId: string,
    decision: string | null,
  ) => {
    const response = await fetch(`/api/nagadim/positions/${positionId}/candidates`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slotId, decision }),
    });
    if (!response.ok) {
      toast.error("עדכון החלטה נכשל");
      return;
    }
    await load();
  };

  const removeSlot = async (positionId: string, slotId: string) => {
    const response = await fetch(`/api/nagadim/positions/${positionId}/candidates`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slotId }),
    });
    if (!response.ok) {
      toast.error("מחיקה נכשלה");
      return;
    }
    await load();
  };

  if (loading) {
    return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  }

  return (
    <div className={pageShellClass}>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          תקנים בפער ומועמדים לשיבוץ (עד {MAX_POSITION_CANDIDATES} לתקן)
        </p>
      </div>

      {showStatusFilter ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "all" as const, label: "הכל" },
              ...GAP_STATUSES.map((status) => ({
                key: status,
                label: GAP_STATUS_LABELS[status],
              })),
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                filter === item.key
                  ? "bg-accent-primary text-white"
                  : "bg-surface-2 text-text-secondary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {canEdit && !showStatusFilter ? (
        <section className={`${panelClass} p-4 sm:p-5`}>
          <h2 className="text-sm font-bold text-text-primary">תקן חדש</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["command", "פיקוד"],
                ["division", "אוגדה"],
                ["brigade", "חטיבה"],
                ["unit", "יחידה"],
                ["activity_level", "רמת פעילות"],
                ["notes", "הערות"],
              ] as const
            ).map(([key, label]) => (
              <input
                key={key}
                className={fieldClass}
                placeholder={label}
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            ))}
          </div>
          <button
            type="button"
            className={`${primaryButtonClass} mt-3`}
            onClick={() => void createPosition()}
          >
            הוסף תקן
          </button>
        </section>
      ) : null}

      <div className="flex flex-col gap-3">
        {positions.length === 0 ? (
          <div className={`${panelClass} p-6 text-sm text-text-muted`}>אין תקנים להצגה</div>
        ) : (
          positions.map((position) => {
            const open = expanded[position.id] ?? false;
            const slot =
              slotForms[position.id] ?? { full_name: "", decision: "", notes: "" };
            return (
              <article key={position.id} className={`${panelClass} overflow-hidden`}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 p-4 text-right sm:p-5"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [position.id]: !open }))
                  }
                >
                  <div>
                    <p className="text-base font-bold text-text-primary">
                      {[position.command, position.division, position.brigade, position.unit]
                        .filter(Boolean)
                        .join(" · ") || "תקן ללא מיקום"}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {[
                        position.activity_level ? `פעילות: ${position.activity_level}` : null,
                        `${position.candidates.length} מועמדים`,
                        position.notes,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${gapStatusTone(position.gap_status)}`}
                  >
                    {GAP_STATUS_LABELS[position.gap_status]}
                  </span>
                </button>

                {open ? (
                  <div className="border-t border-border-weak/40 px-4 pb-4 sm:px-5 sm:pb-5">
                    {canEdit ? (
                      <div className="mb-3 flex flex-wrap gap-2 pt-3">
                        {GAP_STATUSES.map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={
                              position.gap_status === status
                                ? primaryButtonClass
                                : secondaryButtonClass
                            }
                            onClick={() => void setGapStatus(position.id, status)}
                          >
                            {GAP_STATUS_LABELS[status]}
                          </button>
                        ))}
                        {role === "admin" ? (
                          <button
                            type="button"
                            className="rounded-xl bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-700"
                            onClick={() => void deletePosition(position.id)}
                          >
                            מחק תקן
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    <ul className="space-y-2 pt-2">
                      {position.candidates.map((slotRow) => (
                        <li
                          key={slotRow.id}
                          className="flex flex-col gap-2 rounded-xl bg-surface-2/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-bold text-text-primary">
                              {slotRow.full_name}
                            </p>
                            {slotRow.notes ? (
                              <p className="text-xs text-text-muted">{slotRow.notes}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {canEdit ? (
                              <select
                                className={fieldClass}
                                value={slotRow.decision ?? ""}
                                onChange={(e) =>
                                  void patchSlotDecision(
                                    position.id,
                                    slotRow.id,
                                    e.target.value || null,
                                  )
                                }
                              >
                                <option value="">ללא החלטה</option>
                                {POSITION_DECISIONS.map((decision) => (
                                  <option key={decision} value={decision}>
                                    {decision}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs font-semibold text-text-secondary">
                                {slotRow.decision || "ללא החלטה"}
                              </span>
                            )}
                            {canEdit ? (
                              <button
                                type="button"
                                className="rounded-lg bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-700"
                                onClick={() => void removeSlot(position.id, slotRow.id)}
                              >
                                הסר
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>

                    {canEdit && position.candidates.length < MAX_POSITION_CANDIDATES ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-4">
                        <input
                          className={fieldClass}
                          placeholder="שם מועמד לתקן"
                          value={slot.full_name}
                          onChange={(e) =>
                            setSlotForms((prev) => ({
                              ...prev,
                              [position.id]: { ...slot, full_name: e.target.value },
                            }))
                          }
                        />
                        <select
                          className={fieldClass}
                          value={slot.decision}
                          onChange={(e) =>
                            setSlotForms((prev) => ({
                              ...prev,
                              [position.id]: { ...slot, decision: e.target.value },
                            }))
                          }
                        >
                          <option value="">החלטה</option>
                          {POSITION_DECISIONS.map((decision) => (
                            <option key={decision} value={decision}>
                              {decision}
                            </option>
                          ))}
                        </select>
                        <input
                          className={fieldClass}
                          placeholder="הערות"
                          value={slot.notes}
                          onChange={(e) =>
                            setSlotForms((prev) => ({
                              ...prev,
                              [position.id]: { ...slot, notes: e.target.value },
                            }))
                          }
                        />
                        <button
                          type="button"
                          className={primaryButtonClass}
                          onClick={() => void addSlot(position.id)}
                        >
                          הוסף מועמד
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
