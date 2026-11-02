"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DovrutActivityLog,
  DovrutApprovalStatus,
  DovrutAudienceMessage,
  DovrutConcept,
  DovrutInquirySubject,
  DovrutWorkStatus,
} from "@/modules/dovrut/types";
import { DovrutCheckboxGroup } from "@/modules/dovrut/components/checkbox-group";
import { IntervieweePicker } from "@/modules/dovrut/components/interviewee-picker";
import {
  WorkStatusTimeline,
  resolveConceptWorkStatus,
} from "@/modules/dovrut/components/work-status-timeline";
import { dovrutFetch } from "@/modules/dovrut/lib/dovrut-fetch";
import {
  APPROVAL_STATUS_LABELS,
  DOMAIN_LABELS,
  WORK_STATUS_LABELS,
  buildApprovalFlow,
} from "@/modules/dovrut/lib/approval-flows";
import { buildInquiryParagraph } from "@/modules/dovrut/lib/inquiry-subjects";
import {
  APPROVAL_TRAFFIC_STEPS,
  getApprovalTrafficLights,
  trafficLightColorClass,
  trafficLightLabel,
} from "@/modules/dovrut/lib/approval-traffic-light";
import { DOVRUT_AUDIENCES } from "@/modules/dovrut/lib/audiences";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("he-IL");
  } catch {
    return iso;
  }
}

function buildWhatsAppItemText(
  concept: DovrutConcept,
  intervieweeNames: string[],
): string {
  const lines = [
    `*${concept.name}*`,
    concept.project_name ? `פרויקט: ${concept.project_name}` : "",
    concept.media_outlet ? `מערכת: ${concept.media_outlet}` : "",
    concept.details ? concept.details.trim() : "",
  ].filter(Boolean);
  if (intervieweeNames.length > 0) {
    lines.push("", "*מרואיינים:*");
    for (const name of intervieweeNames) {
      lines.push(`• ${name}`);
    }
  }
  return lines.join("\n");
}

export function DovrutConceptDetailsPage({ conceptId }: { conceptId: string }) {
  const [concept, setConcept] = useState<DovrutConcept | null>(null);
  const [activity, setActivity] = useState<DovrutActivityLog[]>([]);
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [publishLink, setPublishLink] = useState("");
  const [mediaOutlet, setMediaOutlet] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [audiences, setAudiences] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [interviewees, setInterviewees] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<DovrutInquirySubject[]>([]);
  const [audienceMessages, setAudienceMessages] = useState<DovrutAudienceMessage[]>([]);
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
    setPublishLink(next?.link ?? "");
    setMediaOutlet(next?.media_outlet ?? "");
    setInterviewer(next?.interviewer ?? "");
    setAudiences(
      next?.target_audiences?.length
        ? next.target_audiences
        : next?.target_audience
          ? [next.target_audience]
          : [],
    );
    setDomains(next?.domains?.length ? next.domains : next?.domain ? [next.domain] : []);
    setInterviewees(next?.interviewees ?? []);
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

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/dovrut/inquiry-subjects");
        const data = await response.json();
        setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      } catch {
        setSubjects([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (audiences.length === 0) {
      setAudienceMessages([]);
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/dovrut/audiences");
        const data = await response.json();
        const all = Array.isArray(data.messages)
          ? (data.messages as DovrutAudienceMessage[])
          : [];
        const audienceSet = new Set(audiences);
        const domainSet = new Set(domains);
        setAudienceMessages(
          all.filter((row) => {
            if (!audienceSet.has(row.audience)) return false;
            if (!row.domain) return true;
            if (domainSet.size === 0) return true;
            return domainSet.has(row.domain);
          }),
        );
      } catch {
        setAudienceMessages([]);
      }
    })();
  }, [audiences, domains]);

  const flow = useMemo(() => {
    if (!concept || concept.type !== "article_interview") return [] as DovrutApprovalStatus[];
    return buildApprovalFlow({
      requires_chief_rabbi: concept.requires_chief_rabbi,
      requires_deputy_commander: concept.requires_deputy_commander,
      requires_branch_head: concept.requires_branch_head,
    });
  }, [concept]);

  const traffic = useMemo(
    () => (concept ? getApprovalTrafficLights(concept) : null),
    [concept],
  );

  const briefingInterviewees = useMemo(() => {
    return interviewees.map((name) => {
      const subject =
        subjects.find((row) => row.name.trim() === name.trim()) ??
        subjects.find(
          (row) => row.name.trim().toLowerCase() === name.trim().toLowerCase(),
        ) ??
        null;
      return {
        name,
        subject,
        title: subject?.role_title?.trim() || null,
        paragraph: subject ? buildInquiryParagraph(subject) : null,
        notes: subject?.notes?.trim() || null,
      };
    });
  }, [interviewees, subjects]);

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
        interviewees,
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

  const markBriefingDone = async () => {
    setSaving(true);
    setMessage("");
    try {
      const data = await dovrutFetch<{ concept: DovrutConcept }>(
        `/api/dovrut/concepts/${conceptId}`,
        { method: "PUT", body: JSON.stringify({ mark_briefing_done: true }) },
      );
      if (data.concept) setConcept(data.concept);
      setMessage("סומן תדרוך כבוצע");
    } catch {
      setMessage("סימון תדרוך נכשל");
    } finally {
      setSaving(false);
    }
  };

  const publishAndArchive = async () => {
    const trimmed = publishLink.trim() || link.trim();
    if (!trimmed) {
      setMessage("יש להזין קישור לפרסום");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await dovrutFetch(`/api/dovrut/concepts/${conceptId}`, {
        method: "PUT",
        body: JSON.stringify({ publish_link: trimmed }),
      });
      const data = await dovrutFetch<{ concept: DovrutConcept }>(
        `/api/dovrut/concepts/${conceptId}`,
        { method: "PUT", body: JSON.stringify({ archive: true }) },
      );
      if (data.concept) setConcept(data.concept);
      setLink(trimmed);
      setPublishLink(trimmed);
      setMessage("פורסם ונסגר לארכיון");
    } catch {
      setMessage("פרסום/ארכוב נכשל");
    } finally {
      setSaving(false);
    }
  };

  const copyWhatsApp = async () => {
    if (!concept) return;
    const text = buildWhatsAppItemText(concept, interviewees);
    await navigator.clipboard.writeText(text);
    setMessage("הועתק לפורמט וואטסאפ");
  };

  const openApprovalWhatsApp = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/dovrut/concepts/${conceptId}/approval-link`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "יצירת קישור נכשלה");
        return;
      }
      if (data.waMeUrl) {
        window.open(data.waMeUrl as string, "_blank", "noopener,noreferrer");
        setMessage("נפתח wa.me לשליחה");
      } else {
        await navigator.clipboard.writeText(String(data.url ?? ""));
        setMessage("אין טלפון לשלב — הקישור הועתק");
      }
    } catch {
      setMessage("יצירת קישור נכשלה");
    } finally {
      setSaving(false);
    }
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

  const currentWork = resolveConceptWorkStatus(concept);
  const isArticle = concept.type === "article_interview";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-3 py-4 sm:px-6 sm:py-6">
      <div className="print:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dovrut/items" className="text-xs font-bold text-accent-primary">
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
        <h1 className="mt-2 break-words text-xl font-bold text-text-primary">{concept.name}</h1>
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
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-text-muted">
          {concept.briefing_done_at ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-800 dark:text-emerald-200">
              תדרוך: {formatWhen(concept.briefing_done_at)}
            </span>
          ) : null}
          {concept.archived_at ? (
            <span className="rounded-full bg-slate-500/15 px-2.5 py-1">
              בארכיון: {formatWhen(concept.archived_at)}
            </span>
          ) : null}
        </div>
      </div>

      <section className="dashboard-glass rounded-3xl p-4 sm:p-5 print:hidden">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-text-primary">סטטוס עבודה</h2>
          <span className="rounded-full bg-accent-primary/12 px-2.5 py-1 text-[11px] font-bold text-accent-primary">
            {WORK_STATUS_LABELS[currentWork]}
          </span>
        </div>
        <p className="mb-2 text-xs text-text-muted">לחצו על שלב בציר כדי לעדכן את הסטטוס</p>
        <WorkStatusTimeline
          currentStatus={currentWork}
          disabled={saving}
          onStatusChange={(status) => void setWorkStatus(status)}
        />
      </section>

      {isArticle ? (
        <section className="dashboard-glass rounded-3xl p-4 print:hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold">ציר אישורים</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyApprovalCode()}
                className="rounded-lg bg-surface-2 px-2.5 py-1 text-[11px] font-bold"
              >
                העתק קוד אישור
              </button>
              <button
                type="button"
                disabled={saving || !concept.approval_status || concept.approval_status === "approved"}
                onClick={() => void openApprovalWhatsApp()}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-40"
              >
                שלח קישור ב‑WhatsApp
              </button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {APPROVAL_TRAFFIC_STEPS.map((step) => {
              const status = traffic?.[step] ?? "skipped";
              return (
                <div
                  key={step}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold ${trafficLightColorClass(status)}`}
                  title={trafficLightLabel(status)}
                >
                  <p>{APPROVAL_STATUS_LABELS[step]}</p>
                  <p className="mt-0.5 text-[10px] font-semibold opacity-90">
                    {trafficLightLabel(status)}
                  </p>
                </div>
              );
            })}
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
                    ? "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/30"
                    : "bg-surface-2/50 text-text-secondary"
                }`}
              >
                <span>{APPROVAL_STATUS_LABELS[step]}</span>
                <span className="text-[10px]">{step}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {isArticle && (currentWork === "production" || currentWork === "approved") ? (
        <section className="dashboard-glass rounded-3xl p-4 print:hidden">
          <h2 className="mb-3 text-sm font-extrabold">ביצוע</h2>
          <div className="flex flex-wrap gap-2">
            {concept.needs_briefing ? (
              <button
                type="button"
                disabled={saving || Boolean(concept.briefing_done_at)}
                onClick={() => void markBriefingDone()}
                className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {concept.briefing_done_at ? "תדרוך בוצע" : "בוצע תדרוך"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-surface-2 px-4 py-2 text-sm font-bold"
            >
              הדפס דף תדרוך
            </button>
            <button
              type="button"
              onClick={() => void copyWhatsApp()}
              className="rounded-xl bg-emerald-600/90 px-4 py-2 text-sm font-bold text-white"
            >
              העתק לוואטסאפ
            </button>
          </div>

          {audienceMessages.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-text-secondary">מסרים לקהל יעד</p>
              <ul className="space-y-2">
                {audienceMessages.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-xl bg-surface-2/60 px-3 py-2 text-sm"
                  >
                    <p className="font-bold">{row.title}</p>
                    <p className="text-[11px] text-text-muted">
                      {row.audience}
                      {row.domain ? ` · ${DOMAIN_LABELS[row.domain] ?? row.domain}` : ""}
                    </p>
                    {row.body ? (
                      <p className="mt-1 whitespace-pre-wrap text-text-secondary">{row.body}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-xs text-text-muted">אין מסרים תואמים לקהלים/תחומים</p>
          )}

          <div className="mt-5 border-t border-surface-2 pt-4">
            <p className="mb-2 text-xs font-bold text-text-secondary">פרסום וסגירה</p>
            <input
              value={publishLink}
              onChange={(event) => setPublishLink(event.target.value)}
              placeholder="קישור לכתבה/ראיון שפורסם"
              className="mb-2 w-full rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none"
              dir="ltr"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void publishAndArchive()}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40 dark:bg-slate-200 dark:text-slate-900"
            >
              סגור ושגר לארכיון
            </button>
          </div>
        </section>
      ) : null}

      <section className="dashboard-glass rounded-3xl p-4 print:hidden">
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
          {isArticle ? (
            <>
              <IntervieweePicker
                subjects={subjects}
                values={interviewees}
                onChange={setInterviewees}
              />
              <input
                value={mediaOutlet}
                onChange={(event) => setMediaOutlet(event.target.value)}
                placeholder="מערכת"
                className="rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none"
              />
              <input
                value={interviewer}
                onChange={(event) => setInterviewer(event.target.value)}
                placeholder="שם המראיין (אופציונלי)"
                className="rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none"
              />
              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="קישור (כתבה/ראיון)"
                className="rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none"
              />
              <div className="space-y-2 rounded-xl bg-surface-2/50 p-3">
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
                className="min-h-28 rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                disabled={aiBusy || !draftText.trim()}
                onClick={() => void runAiWording()}
                className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-40"
              >
                {aiBusy ? "מנסח…" : "שפר ניסוח (AI)"}
              </button>
            </>
          )}
          <input
            value={linkedTaskId}
            onChange={(event) => setLinkedTaskId(event.target.value)}
            placeholder="מזהה משימה מקושרת (UUID, אופציונלי)"
            className="rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none"
            dir="ltr"
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="הערות"
            className="min-h-24 rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveFields()}
            className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            שמור
          </button>
        </div>
      </section>

      <section className="dashboard-glass rounded-3xl p-4 print:hidden">
        <h2 className="mb-3 text-sm font-extrabold">טיימליין פעילות</h2>
        <ul className="space-y-2">
          {activity.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border-s-2 border-accent-primary/40 bg-surface-2/50 px-3 py-2 text-xs"
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

      {/* Print-only briefing sheet */}
      <section className="hidden print:block print:p-6" dir="rtl">
        <h1 className="text-2xl font-bold">{concept.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">{concept.project_name}</p>
        {concept.details ? (
          <div className="mt-4">
            <h2 className="text-sm font-bold">פרטים</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">{concept.details}</p>
          </div>
        ) : null}
        {briefingInterviewees.length > 0 ? (
          <div className="mt-4 break-inside-avoid">
            <h2 className="text-base font-bold">מרואיינים — סיכום</h2>
            <ul className="mt-3 space-y-4 text-sm">
              {briefingInterviewees.map((row) => (
                <li
                  key={row.name}
                  className="break-inside-avoid rounded border border-neutral-300 p-3"
                >
                  <p className="text-base font-extrabold">
                    {row.title ? `${row.title} · ${row.name}` : row.name}
                  </p>
                  {row.paragraph ? (
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                      {row.paragraph}
                    </p>
                  ) : (
                    <p className="mt-2 text-neutral-600">
                      לא נמצא כרטיס גורם תחקור תואם לשם זה.
                    </p>
                  )}
                  {row.notes ? (
                    <div className="mt-2 border-t border-neutral-200 pt-2">
                      <p className="text-xs font-bold">הערות</p>
                      <p className="mt-1 whitespace-pre-wrap">{row.notes}</p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {audienceMessages.length > 0 ? (
          <div className="mt-4">
            <h2 className="text-sm font-bold">מסרים</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {audienceMessages.map((row) => (
                <li key={row.id}>
                  <p className="font-bold">{row.title}</p>
                  {row.body ? <p className="whitespace-pre-wrap">{row.body}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {message ? (
        <p className="text-xs font-semibold text-accent-primary print:hidden">{message}</p>
      ) : null}
    </div>
  );
}
