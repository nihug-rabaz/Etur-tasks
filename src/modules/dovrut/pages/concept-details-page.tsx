"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DovrutActivityLog,
  DovrutApprovalStatus,
  DovrutConcept,
  DovrutWorkStatus,
} from "@/modules/dovrut/types";
import { DovrutCheckboxGroup } from "@/modules/dovrut/components/checkbox-group";
import { dovrutFetch } from "@/modules/dovrut/lib/dovrut-fetch";
import {
  APPROVAL_STATUS_LABELS,
  DOMAIN_LABELS,
  WORK_STATUS_LABELS,
  WORK_STATUS_ORDER,
  buildApprovalFlow,
} from "@/modules/dovrut/lib/approval-flows";
import { DOVRUT_AUDIENCES } from "@/modules/dovrut/lib/audiences";

export function DovrutConceptDetailsPage({ conceptId }: { conceptId: string }) {
  const [concept, setConcept] = useState<DovrutConcept | null>(null);
  const [activity, setActivity] = useState<DovrutActivityLog[]>([]);
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [mediaOutlet, setMediaOutlet] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [audiences, setAudiences] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [needsBriefing, setNeedsBriefing] = useState(true);
  const [requiresChief, setRequiresChief] = useState(true);
  const [requiresDeputy, setRequiresDeputy] = useState(true);
  const [requiresBranch, setRequiresBranch] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState("");
  const [draftText, setDraftText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const data = await dovrutFetch<{
      concept: DovrutConcept | null;
      activity: DovrutActivityLog[];
    }>(`/api/dovrut/concepts/${conceptId}`);
    const next = data.concept ?? null;
    setConcept(next);
    setActivity(Array.isArray(data.activity) ? data.activity : []);
    setNotes(next?.notes ?? "");
    setLink(next?.link ?? "");
    setMediaOutlet(next?.media_outlet ?? "");
    setInterviewer(next?.interviewer ?? "");
    setAudiences(next?.target_audiences?.length ? next.target_audiences : next?.target_audience ? [next.target_audience] : []);
    setDomains(next?.domains?.length ? next.domains : next?.domain ? [next.domain] : []);
    setNeedsBriefing(Boolean(next?.needs_briefing));
    setRequiresChief(Boolean(next?.requires_chief_rabbi));
    setRequiresDeputy(Boolean(next?.requires_deputy_commander));
    setRequiresBranch(Boolean(next?.requires_branch_head));
    setLinkedTaskId(next?.linked_task_id ?? "");
    setDraftText(next?.draft_text ?? next?.details ?? "");
  }, [conceptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const flow = useMemo(() => {
    if (!concept || concept.type !== "article_interview") return [] as DovrutApprovalStatus[];
    return buildApprovalFlow({
      requires_chief_rabbi: concept.requires_chief_rabbi,
      requires_deputy_commander: concept.requires_deputy_commander,
      requires_branch_head: concept.requires_branch_head,
    });
  }, [concept]);

  const saveFields = async () => {
    setSaving(true);
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        notes,
        target_audiences: audiences,
        target_audience: audiences[0] ?? null,
        domains,
        domain: domains[0] ?? null,
        needs_briefing: needsBriefing,
        requires_chief_rabbi: requiresChief,
        requires_deputy_commander: requiresDeputy,
        requires_branch_head: requiresBranch,
        linked_task_id: linkedTaskId.trim() || null,
      };
      if (concept?.type === "article_interview") {
        body.media_outlet = mediaOutlet.trim() || null;
        body.interviewer = interviewer.trim() || null;
        body.link = link.trim() || null;
      } else {
        body.draft_text = draftText;
        body.link = null;
      }
      await dovrutFetch(`/api/dovrut/concepts/${conceptId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setMessage("נשמר");
      await load();
    } catch {
      setMessage("שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const setWorkStatus = async (status: DovrutWorkStatus) => {
    if (!concept) return;
    const previous = concept;
    const field =
      concept.type === "article_interview" ? "work_status_article" : "work_status_social";
    setConcept({ ...concept, [field]: status });
    try {
      const data = await dovrutFetch<{ concept: DovrutConcept }>(
        `/api/dovrut/concepts/${conceptId}`,
        { method: "PUT", body: JSON.stringify({ [field]: status }) },
      );
      if (data.concept) setConcept(data.concept);
    } catch {
      setConcept(previous);
      setMessage("עדכון סטטוס נכשל");
    }
  };

  const setApproval = async (status: DovrutApprovalStatus) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/dovrut/concepts/${conceptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_status: status }),
      });
      if (!response.ok) {
        setMessage("רק מנהל יכול לשנות סטטוס אישורים ישירות");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const copyApprovalCode = async () => {
    if (!concept?.approval_status || concept.approval_status === "approved") return;
    const code = `${concept.id}:${concept.approval_status}`;
    await navigator.clipboard.writeText(code);
    setMessage("קוד אישור הועתק");
  };

  const runAiWording = async () => {
    if (!draftText.trim()) return;
    setAiBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/dovrut/ai/wording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draftText, audience: audiences[0] || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "ניסוח AI נכשל");
        return;
      }
      setDraftText(data.text ?? draftText);
      setMessage("נוסח עודכן");
    } finally {
      setAiBusy(false);
    }
  };

  if (!concept) return <div className="text-sm text-text-muted">טוען אייטם…</div>;

  const currentWork =
    concept.type === "article_interview"
      ? concept.work_status_article
      : concept.work_status_social;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <Link href="/dovrut/items" className="text-xs font-bold text-violet-600">
            ← חזרה לאייטמים
          </Link>
          <button
            type="button"
            onClick={() =>
              void fetch(`/api/dovrut/concepts/${conceptId}`, { method: "DELETE" }).then(() => {
                window.location.href = "/dovrut/recycle-bin";
              })
            }
            className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
          >
            מחק לסל מחזור
          </button>
        </div>
        <h1 className="mt-2 text-xl font-bold text-text-primary">{concept.name}</h1>
        <p className="mt-1 text-sm text-text-muted">
          {concept.project_name}
          {(concept.domains ?? []).length
            ? ` · ${(concept.domains ?? []).map((value) => DOMAIN_LABELS[value] ?? value).join(", ")}`
            : concept.domain
              ? ` · ${DOMAIN_LABELS[concept.domain]}`
              : ""}
          {(concept.target_audiences ?? []).length
            ? ` · קהל: ${(concept.target_audiences ?? []).join(", ")}`
            : concept.target_audience
              ? ` · קהל: ${concept.target_audience}`
              : ""}
        </p>
      </div>

      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">סטטוס עבודה</h2>
        <div className="flex flex-wrap gap-2">
          {WORK_STATUS_ORDER.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => void setWorkStatus(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                currentWork === value
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-text-secondary dark:bg-slate-800"
              }`}
            >
              {WORK_STATUS_LABELS[value]}
            </button>
          ))}
        </div>
      </section>

      {concept.type === "article_interview" ? (
        <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold">ציר אישורים</h2>
            <button
              type="button"
              onClick={() => void copyApprovalCode()}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold dark:bg-slate-800"
            >
              העתק קוד אישור
            </button>
          </div>
          <div className="space-y-2">
            {flow.map((step) => (
              <button
                key={step}
                type="button"
                disabled={saving}
                onClick={() => void setApproval(step)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-sm font-semibold ${
                  concept.approval_status === step
                    ? "bg-violet-50 text-violet-800 ring-1 ring-violet-300 dark:bg-violet-950 dark:text-violet-200"
                    : "bg-slate-50 text-text-secondary dark:bg-slate-800"
                }`}
              >
                <span>{APPROVAL_STATUS_LABELS[step]}</span>
                <span className="text-[10px]">{step}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">פרטים</h2>
        <div className="grid gap-2">
          <DovrutCheckboxGroup
            label="קהלי יעד"
            options={DOVRUT_AUDIENCES.map((value) => ({ value, label: value }))}
            values={audiences}
            onChange={setAudiences}
          />
          <DovrutCheckboxGroup
            label="תחומים"
            options={Object.entries(DOMAIN_LABELS).map(([value, label]) => ({ value, label }))}
            values={domains}
            onChange={setDomains}
          />
          {concept.type === "article_interview" ? (
            <>
              <input
                value={mediaOutlet}
                onChange={(event) => setMediaOutlet(event.target.value)}
                placeholder="מערכת"
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
              />
              <input
                value={interviewer}
                onChange={(event) => setInterviewer(event.target.value)}
                placeholder="שם המראיין (אופציונלי)"
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
              />
              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="קישור (כתבה/ראיון)"
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
              />
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
                <p className="text-xs font-bold text-text-secondary">אישורים נדרשים</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requiresChief}
                    onChange={(e) => setRequiresChief(e.target.checked)}
                  />
                  רבצ״ר
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requiresDeputy}
                    onChange={(e) => setRequiresDeputy(e.target.checked)}
                  />
                  רמ״ט
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requiresBranch}
                    onChange={(e) => setRequiresBranch(e.target.checked)}
                  />
                  רמ״ח
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={needsBriefing}
                    onChange={(e) => setNeedsBriefing(e.target.checked)}
                  />
                  צריך לתדרך
                </label>
              </div>
            </>
          ) : (
            <>
              <textarea
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                placeholder="טיוטת תוכן לרשתות"
                className="min-h-28 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
              />
              <button
                type="button"
                disabled={aiBusy || !draftText.trim()}
                onClick={() => void runAiWording()}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40 dark:bg-slate-600"
              >
                {aiBusy ? "מנסח…" : "שפר ניסוח (AI)"}
              </button>
            </>
          )}
          <input
            value={linkedTaskId}
            onChange={(event) => setLinkedTaskId(event.target.value)}
            placeholder="מזהה משימה מקושרת (UUID, אופציונלי)"
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
            dir="ltr"
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="הערות"
            className="min-h-24 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveFields()}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            שמור
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">טיימליין פעילות</h2>
        <ul className="space-y-2">
          {activity.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border-s-2 border-violet-400 bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800"
            >
              <p className="font-bold text-text-primary">
                {row.details || row.action_type} · {row.user_name}
              </p>
              <p className="text-text-muted">
                {row.field_changed
                  ? `${row.field_changed}: ${row.old_value ?? "—"} → ${row.new_value ?? "—"}`
                  : null}
              </p>
              <p className="mt-0.5 text-[10px] text-text-muted">
                {new Date(row.created_at).toLocaleString("he-IL")}
              </p>
            </li>
          ))}
          {activity.length === 0 ? (
            <p className="text-sm text-text-muted">אין היסטוריה</p>
          ) : null}
        </ul>
      </section>

      {message ? <p className="text-xs font-semibold text-violet-700">{message}</p> : null}
    </div>
  );
}
