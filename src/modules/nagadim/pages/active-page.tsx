"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_STAGE,
  formatEventCell,
  latestEventForStage,
  PIPELINE_STAGES,
} from "@/modules/nagadim/lib/stages";
import {
  fieldClass,
  pageShellClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/nagadim/lib/ui";
import type { NagadimCandidateWithEvents } from "@/modules/nagadim/types";
import type { ModuleRole } from "@/shared/modules/types";

export function NagadimActivePage() {
  const [candidates, setCandidates] = useState<NagadimCandidateWithEvents[]>([]);
  const [role, setRole] = useState<ModuleRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [notes, setNotes] = useState("");
  const [stageCandidateId, setStageCandidateId] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState({
    stage: DEFAULT_STAGE,
    person_name: "",
    event_date: "",
    command: "",
    unit: "",
    notes: "",
  });

  const canEdit = role === "admin" || role === "user";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nagadim/candidates");
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as {
        candidates: NagadimCandidateWithEvents[];
        role: ModuleRole;
      };
      setCandidates(data.candidates);
      setRole(data.role);
    } catch {
      toast.error("טעינת המועמדים נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createCandidate = async () => {
    if (!fullName.trim()) return;
    const response = await fetch("/api/nagadim/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName.trim(), notes: notes || null }),
    });
    if (!response.ok) {
      toast.error("יצירת מועמד נכשלה");
      return;
    }
    setFullName("");
    setNotes("");
    toast.success("מועמד נוסף");
    await load();
  };

  const submitStage = async () => {
    if (!stageCandidateId) return;
    const response = await fetch(`/api/nagadim/candidates/${stageCandidateId}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: stageForm.stage,
        person_name: stageForm.person_name || null,
        event_date: stageForm.event_date || null,
        command: stageForm.command || null,
        unit: stageForm.unit || null,
        notes: stageForm.notes || null,
      }),
    });
    if (!response.ok) {
      toast.error("שמירת שלב נכשלה");
      return;
    }
    toast.success("שלב עודכן");
    setStageCandidateId(null);
    await load();
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm("למחוק מועמד?")) return;
    const response = await fetch(`/api/nagadim/candidates/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("מחיקה נכשלה");
      return;
    }
    toast.success("נמחק");
    await load();
  };

  const sorted = useMemo(
    () => [...candidates].sort((a, b) => a.full_name.localeCompare(b.full_name, "he")),
    [candidates],
  );

  if (loading) {
    return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  }

  return (
    <div className={pageShellClass}>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
          איתור פעיל
        </h1>
        <p className="mt-1 text-sm text-text-secondary">צינור מועמדים לפי שלבי האיתור</p>
      </div>

      {canEdit ? (
        <section className={`${panelClass} p-4 sm:p-5`}>
          <h2 className="text-sm font-bold text-text-primary">מועמד חדש</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input
              className={fieldClass}
              placeholder="שם מלא"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              className={fieldClass}
              placeholder="הערות"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button type="button" className={primaryButtonClass} onClick={() => void createCandidate()}>
              הוסף
            </button>
          </div>
        </section>
      ) : null}

      {stageCandidateId && canEdit ? (
        <section className={`${panelClass} p-4 sm:p-5`}>
          <h2 className="text-sm font-bold text-text-primary">אירוע שלב</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className={fieldClass}
              value={stageForm.stage}
              onChange={(e) => setStageForm((s) => ({ ...s, stage: e.target.value as typeof s.stage }))}
            >
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <input
              className={fieldClass}
              placeholder="שם מטפל / מראיין"
              value={stageForm.person_name}
              onChange={(e) => setStageForm((s) => ({ ...s, person_name: e.target.value }))}
            />
            <input
              type="date"
              className={fieldClass}
              value={stageForm.event_date}
              onChange={(e) => setStageForm((s) => ({ ...s, event_date: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="פיקוד"
              value={stageForm.command}
              onChange={(e) => setStageForm((s) => ({ ...s, command: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="יחידה"
              value={stageForm.unit}
              onChange={(e) => setStageForm((s) => ({ ...s, unit: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="הערות"
              value={stageForm.notes}
              onChange={(e) => setStageForm((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={primaryButtonClass} onClick={() => void submitStage()}>
              שמור שלב
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setStageCandidateId(null)}
            >
              ביטול
            </button>
          </div>
        </section>
      ) : null}

      <div className={`${panelClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-surface-2/80 text-xs font-bold text-text-muted">
              <tr>
                <th className="px-3 py-3">שם</th>
                <th className="px-3 py-3">שלב נוכחי</th>
                {PIPELINE_STAGES.map((stage) => (
                  <th key={stage} className="px-3 py-3 whitespace-nowrap">
                    {stage}
                  </th>
                ))}
                {canEdit ? <th className="px-3 py-3">פעולות</th> : null}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={PIPELINE_STAGES.length + (canEdit ? 3 : 2)}
                    className="px-3 py-8 text-center text-text-muted"
                  >
                    אין מועמדים עדיין
                  </td>
                </tr>
              ) : (
                sorted.map((candidate) => (
                  <tr key={candidate.id} className="border-t border-border-weak/40">
                    <td className="px-3 py-3 font-bold text-text-primary">{candidate.full_name}</td>
                    <td className="px-3 py-3 text-text-secondary">{candidate.current_stage}</td>
                    {PIPELINE_STAGES.map((stage) => (
                      <td key={stage} className="px-3 py-3 text-xs text-text-secondary">
                        {formatEventCell(latestEventForStage(candidate.stage_events, stage))}
                      </td>
                    ))}
                    {canEdit ? (
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-bold"
                            onClick={() => {
                              setStageCandidateId(candidate.id);
                              setStageForm({
                                stage: (PIPELINE_STAGES.includes(
                                  candidate.current_stage as (typeof PIPELINE_STAGES)[number],
                                )
                                  ? candidate.current_stage
                                  : DEFAULT_STAGE) as typeof DEFAULT_STAGE,
                                person_name: "",
                                event_date: "",
                                command: "",
                                unit: "",
                                notes: "",
                              });
                            }}
                          >
                            שלב
                          </button>
                          {role === "admin" ? (
                            <button
                              type="button"
                              className="rounded-lg bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-700"
                              onClick={() => void deleteCandidate(candidate.id)}
                            >
                              מחק
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
