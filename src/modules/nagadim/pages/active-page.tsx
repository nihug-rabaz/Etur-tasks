"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_STAGE,
  formatEventCell,
  latestEventForStage,
  PIPELINE_OUTCOMES,
  PIPELINE_STAGES,
  STAGE_RESULTS,
} from "@/modules/nagadim/lib/stages";
import {
  fieldClass,
  pageShellClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/nagadim/lib/ui";
import type {
  NagadimCandidateWithEvents,
  NagadimPipelineOutcome,
  NagadimPipelineStage,
  NagadimStageResult,
} from "@/modules/nagadim/types";
import type { ModuleRole } from "@/shared/modules/types";

type CreateFormState = {
  full_name: string;
  phone: string;
  id_number: string;
  personal_number: string;
  family_status: string;
  children_count: string;
  residence: string;
  notes: string;
};

const emptyCreateForm = (): CreateFormState => ({
  full_name: "",
  phone: "",
  id_number: "",
  personal_number: "",
  family_status: "",
  children_count: "",
  residence: "",
  notes: "",
});

function parseChildrenCount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function identitySummary(candidate: NagadimCandidateWithEvents): string {
  const parts = [
    candidate.personal_number ? `מ\"א ${candidate.personal_number}` : null,
    candidate.id_number ? `ת\"ז ${candidate.id_number}` : null,
    candidate.phone,
    candidate.family_status,
    candidate.children_count != null ? `${candidate.children_count} ילדים` : null,
    candidate.residence,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function NagadimActivePage() {
  const [candidates, setCandidates] = useState<NagadimCandidateWithEvents[]>([]);
  const [role, setRole] = useState<ModuleRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stageCandidateId, setStageCandidateId] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState({
    stage: DEFAULT_STAGE as NagadimPipelineStage,
    person_name: "",
    event_date: "",
    command: "",
    unit: "",
    result: "" as "" | NagadimStageResult,
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

  const saveCandidate = async () => {
    if (!createForm.full_name.trim()) return;
    if (createForm.children_count.trim() && parseChildrenCount(createForm.children_count) == null) {
      toast.error("מספר ילדים לא תקין");
      return;
    }
    const payload = {
      full_name: createForm.full_name.trim(),
      phone: createForm.phone || null,
      id_number: createForm.id_number || null,
      personal_number: createForm.personal_number || null,
      family_status: createForm.family_status || null,
      children_count: parseChildrenCount(createForm.children_count),
      residence: createForm.residence || null,
      notes: createForm.notes || null,
    };
    const response = await fetch(
      editingId ? `/api/nagadim/candidates/${editingId}` : "/api/nagadim/candidates",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      toast.error(editingId ? "עדכון נגד נכשל" : "יצירת נגד נכשלה");
      return;
    }
    setCreateForm(emptyCreateForm());
    setEditingId(null);
    toast.success(editingId ? "נגד עודכן" : "נגד נוסף");
    await load();
  };

  const startEdit = (candidate: NagadimCandidateWithEvents) => {
    setEditingId(candidate.id);
    setCreateForm({
      full_name: candidate.full_name,
      phone: candidate.phone ?? "",
      id_number: candidate.id_number ?? "",
      personal_number: candidate.personal_number ?? "",
      family_status: candidate.family_status ?? "",
      children_count:
        candidate.children_count == null ? "" : String(candidate.children_count),
      residence: candidate.residence ?? "",
      notes: candidate.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        result: stageForm.result || null,
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

  const setOutcome = async (id: string, outcome: NagadimPipelineOutcome | null) => {
    const response = await fetch(`/api/nagadim/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_outcome: outcome }),
    });
    if (!response.ok) {
      toast.error("עדכון תוצאת גיוס נכשל");
      return;
    }
    toast.success("תוצאת גיוס עודכנה");
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
        <p className="mt-1 text-sm text-text-secondary">יצירת נגד ומעקב צינור גיוס</p>
      </div>

      {canEdit ? (
        <section className={`${panelClass} p-4 sm:p-5`}>
          <h2 className="text-sm font-bold text-text-primary">
            {editingId ? "עריכת נגד" : "יצירת נגד"}
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <input
              className={fieldClass}
              placeholder="שם מלא"
              value={createForm.full_name}
              onChange={(e) => setCreateForm((s) => ({ ...s, full_name: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="מספר טלפון"
              value={createForm.phone}
              onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="תעודת זהות"
              value={createForm.id_number}
              onChange={(e) => setCreateForm((s) => ({ ...s, id_number: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="מספר אישי"
              value={createForm.personal_number}
              onChange={(e) => setCreateForm((s) => ({ ...s, personal_number: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="מצב משפחתי"
              value={createForm.family_status}
              onChange={(e) => setCreateForm((s) => ({ ...s, family_status: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="מספר ילדים"
              inputMode="numeric"
              value={createForm.children_count}
              onChange={(e) => setCreateForm((s) => ({ ...s, children_count: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="מגורים"
              value={createForm.residence}
              onChange={(e) => setCreateForm((s) => ({ ...s, residence: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="הערות"
              value={createForm.notes}
              onChange={(e) => setCreateForm((s) => ({ ...s, notes: e.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={primaryButtonClass} onClick={() => void saveCandidate()}>
                {editingId ? "שמור שינויים" : "הוסף נגד"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setEditingId(null);
                    setCreateForm(emptyCreateForm());
                  }}
                >
                  ביטול עריכה
                </button>
              ) : null}
            </div>
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
              onChange={(e) =>
                setStageForm((s) => ({
                  ...s,
                  stage: e.target.value as NagadimPipelineStage,
                }))
              }
            >
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={stageForm.result}
              onChange={(e) =>
                setStageForm((s) => ({
                  ...s,
                  result: e.target.value as "" | NagadimStageResult,
                }))
              }
            >
              <option value="">תוצאה (אופציונלי)</option>
              {STAGE_RESULTS.map((result) => (
                <option key={result} value={result}>
                  {result}
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
              placeholder="שם פיקוד"
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
                <th className="px-3 py-3">גיוס</th>
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
                    colSpan={PIPELINE_STAGES.length + (canEdit ? 4 : 3)}
                    className="px-3 py-8 text-center text-text-muted"
                  >
                    אין מועמדים עדיין
                  </td>
                </tr>
              ) : (
                sorted.map((candidate) => {
                  const summary = identitySummary(candidate);
                  return (
                    <tr key={candidate.id} className="border-t border-border-weak/40">
                      <td className="px-3 py-3">
                        <div className="font-bold text-text-primary">{candidate.full_name}</div>
                        {summary ? (
                          <div className="mt-1 text-xs text-text-muted">{summary}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-text-secondary">{candidate.current_stage}</td>
                      <td className="px-3 py-3">
                        {canEdit ? (
                          <select
                            className={`${fieldClass} min-w-[7rem] py-1 text-xs`}
                            value={candidate.pipeline_outcome ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              void setOutcome(
                                candidate.id,
                                value === "" ? null : (value as NagadimPipelineOutcome),
                              );
                            }}
                          >
                            <option value="">—</option>
                            {PIPELINE_OUTCOMES.map((outcome) => (
                              <option key={outcome} value={outcome}>
                                {outcome}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-text-secondary">
                            {candidate.pipeline_outcome ?? "—"}
                          </span>
                        )}
                      </td>
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
                              onClick={() => startEdit(candidate)}
                            >
                              עריכה
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-bold"
                              onClick={() => {
                                setStageCandidateId(candidate.id);
                                setStageForm({
                                  stage: (PIPELINE_STAGES.includes(
                                    candidate.current_stage as NagadimPipelineStage,
                                  )
                                    ? candidate.current_stage
                                    : DEFAULT_STAGE) as NagadimPipelineStage,
                                  person_name: "",
                                  event_date: "",
                                  command: "",
                                  unit: "",
                                  result: "",
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
