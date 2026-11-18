"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { AgamQuestionField } from "@/modules/agam/components/question-field";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { interviewMissingItems } from "@/modules/agam/lib/interview-readiness";
import { groupQuestionsBySection, isQuestionVisible } from "@/modules/agam/lib/questions";
import { RECOMMENDATIONS } from "@/modules/agam/lib/stages";
import {
  dividerTopClass,
  fieldClass,
  formShellClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/agam/lib/ui";
import type { AgamInterview, AgamQuestion, AgamRecommendation } from "@/modules/agam/types";
import Link from "next/link";

export function AgamInterviewPage({
  candidateId,
  interviewId,
  embedded = false,
  onDone,
}: {
  candidateId: string;
  interviewId?: string;
  /** Rendered inside the candidate file (modal): no page header, save/cancel call onDone. */
  embedded?: boolean;
  onDone?: (saved: boolean) => void;
}) {
  const [questions, setQuestions] = useState<AgamQuestion[]>([]);
  const [interview, setInterview] = useState<AgamInterview | null>(null);
  const [candidatePartComplete, setCandidatePartComplete] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState("");
  const [recommendation, setRecommendation] = useState<AgamRecommendation | "">("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    void agamFetch<{
      questions: AgamQuestion[];
      interview: AgamInterview | null;
      candidatePartComplete: boolean;
    }>(
      `/api/agam/interviews?candidateId=${candidateId}${interviewId ? `&interviewId=${interviewId}` : ""}`,
    )
      .then((json) => {
        setQuestions(json.questions ?? []);
        setInterview(json.interview);
        setCandidatePartComplete(Boolean(json.candidatePartComplete));
        const interviewData = (json.interview?.interview_data ?? {}) as Record<string, unknown>;
        const next: Record<string, string> = {};
        for (const [key, value] of Object.entries(interviewData)) next[key] = String(value ?? "");
        setData(next);
        setAssessment(json.interview?.evaluator_assessment ?? "");
        setRecommendation(json.interview?.recommendation ?? "");
      })
      .catch(() => toast.error("טעינת טופס הראיון נכשלה"))
      .finally(() => setLoaded(true));
  }, [candidateId, interviewId]);

  const sections = useMemo(() => groupQuestionsBySection(questions), [questions]);
  const candidateAnswers = (interview?.candidate_part ?? {}) as Record<string, unknown>;

  const missing = useMemo(
    () => (candidatePartComplete ? [] : interviewMissingItems(interview, questions)),
    [candidatePartComplete, interview, questions],
  );
  const showWarning = loaded && missing.length > 0 && !acknowledged;

  const leave = () => {
    if (onDone) onDone(false);
    else window.location.href = `/agam/candidates/${candidateId}?stage=day_selection`;
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/interviews", {
        method: "POST",
        body: JSON.stringify({
          candidateId,
          interviewId: interviewId ?? interview?.id,
          interviewData: data,
          evaluatorAssessment: assessment,
          recommendation: recommendation || null,
          force: !candidatePartComplete,
        }),
      });
      toast.success("הראיון נשמר");
      if (onDone) onDone(true);
      else window.location.href = `/agam/candidates/${candidateId}?stage=day_selection`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;

  const warning = (
    <MissingCandidatePartWarning items={missing} onProceed={() => setAcknowledged(true)} onBack={leave} />
  );
  if (embedded && showWarning) return warning;

  return (
    <div className={embedded ? "space-y-4" : formShellClass}>
      {embedded ? null : (
        <header className={`${panelClass} p-5 sm:p-6`}>
          <Link
            href={`/agam/candidates/${candidateId}?stage=day_selection`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted transition hover:text-text-primary"
          >
            <ChevronLeft size={14} className="rotate-180" />
            חזרה ליום המיונים
          </Link>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">תיק מועמד</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            ראיון
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">חלק הממיין — התרשמות והמלצה</p>
        </header>
      )}

      {!embedded ? (
        <Modal open={showWarning} onClose={leave} title="חלק המועמד בראיון לא הושלם" size="md">
          {warning}
        </Modal>
      ) : null}

      {missing.length > 0 && acknowledged ? (
        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm ring-1 ring-amber-500/20">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
          <p className="font-semibold text-text-primary">
            ממלאים ראיון לפני שהמועמד השלים את החלק שלו בפורטל. הראיון יישמר כרגיל, והמועמד עדיין יוכל להשלים את החלק
            שלו.
          </p>
        </div>
      ) : null}

      {Object.keys(candidateAnswers).length > 0 ? (
        <section className={`${panelClass} space-y-3 p-5 sm:p-6`}>
          <h2 className="text-sm font-bold text-text-primary">תשובות המועמד</h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            {Object.entries(candidateAnswers).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-surface-2/70 px-3 py-2.5">
                <dt className="text-[11px] text-text-muted">{key}</dt>
                <dd className="mt-1 text-sm font-semibold text-text-primary">{String(value ?? "—")}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {sections.map(([num, section]) => {
        const visible = section.items.filter((question) => isQuestionVisible(question, data));
        if (visible.length === 0) return null;
        return (
          <section key={num} className={`${panelClass} space-y-4 p-5 sm:p-6`}>
            <h2 className="text-sm font-bold text-text-primary">{section.name}</h2>
            {visible.map((question) => (
              <AgamQuestionField
                key={question.id}
                question={question}
                value={data[question.field_key] ?? ""}
                onChange={(value) => setData((current) => ({ ...current, [question.field_key]: value }))}
              />
            ))}
          </section>
        );
      })}

      <section className={`${panelClass} space-y-4 p-5 sm:p-6`}>
        <label className="block space-y-2 text-sm font-semibold text-text-primary">
          התרשמות והערכת הממיין
          <textarea
            className={fieldClass}
            rows={4}
            placeholder="כתוב התרשמות חופשית מהריאיון..."
            value={assessment}
            onChange={(event) => setAssessment(event.target.value)}
          />
        </label>
        <div>
          <p className="mb-2 text-xs font-semibold text-text-muted">המלצה</p>
          <div className="flex flex-wrap gap-2">
            {RECOMMENDATIONS.map((item) => (
              <button
                key={item}
                type="button"
                className={
                  recommendation === item
                    ? "inline-flex items-center justify-center rounded-xl bg-text-primary px-3.5 py-2 text-sm font-bold text-white"
                    : secondaryButtonClass
                }
                onClick={() => setRecommendation(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className={`flex flex-wrap gap-2 pt-2 ${dividerTopClass}`}>
          <button type="button" className={primaryButtonClass} onClick={() => void onSave()} disabled={saving}>
            {saving ? "שומר…" : "שמירת ראיון"}
          </button>
          {onDone ? (
            <button type="button" className={secondaryButtonClass} onClick={() => onDone(false)} disabled={saving}>
              ביטול
            </button>
          ) : (
            <Link href={`/agam/candidates/${candidateId}?stage=day_selection`} className={secondaryButtonClass}>
              ביטול
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

function MissingCandidatePartWarning({
  items,
  onProceed,
  onBack,
}: {
  items: string[];
  onProceed: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 px-4 py-3.5 ring-1 ring-amber-500/25">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <AlertTriangle size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-text-primary">המועמד עוד לא השלים את החלק שלו בראיון</p>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            לפני הראיון המועמד עונה בפורטל המועמד על שאלות הרקע שלו, ואז לוחץ ״סיום והגשה״. התשובות שלו מופיעות לך
            בטופס הראיון.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-extrabold text-text-muted">מה חסר כרגע</p>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 rounded-xl bg-surface-2/70 px-3 py-2 text-sm font-semibold text-text-primary">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className={`flex flex-wrap gap-2 pt-3 ${dividerTopClass}`}>
        <button type="button" className={primaryButtonClass} onClick={onProceed}>
          הזן ראיון בכל מקרה
        </button>
        <button type="button" className={secondaryButtonClass} onClick={onBack}>
          חזרה
        </button>
      </div>
    </div>
  );
}
