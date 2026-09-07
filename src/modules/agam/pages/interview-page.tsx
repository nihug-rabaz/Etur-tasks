"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { AgamQuestionField } from "@/modules/agam/components/question-field";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
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
}: {
  candidateId: string;
  interviewId?: string;
}) {
  const [questions, setQuestions] = useState<AgamQuestion[]>([]);
  const [interview, setInterview] = useState<AgamInterview | null>(null);
  const [candidatePartComplete, setCandidatePartComplete] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState("");
  const [recommendation, setRecommendation] = useState<AgamRecommendation | "">("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

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

  const onSave = async () => {
    if (!candidatePartComplete) {
      toast.error("חלק המועמד בראיון עדיין לא הושלם");
      return;
    }
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
        }),
      });
      toast.success("הראיון נשמר");
      window.location.href = `/agam/candidates/${candidateId}?stage=day_selection`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;

  if (!candidatePartComplete) {
    return (
      <div className={formShellClass}>
        <header className={`${panelClass} p-5 sm:p-6`}>
          <Link
            href={`/agam/candidates/${candidateId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted transition hover:text-text-primary"
          >
            <ChevronLeft size={14} className="rotate-180" />
            חזרה לתיק
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold text-text-primary">ראיון</h1>
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-surface-2/80 p-4 text-sm text-text-secondary">
            <Lock size={18} className="mt-0.5 shrink-0 text-text-primary" />
            <p>
              חלק המועמד בראיון עדיין לא הושלם בפורטל. לאחר שהמועמד ישלים את חלקו תוכלו למלא את חלק הממיין.
            </p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className={formShellClass}>
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
          <Link href={`/agam/candidates/${candidateId}?stage=day_selection`} className={secondaryButtonClass}>
            ביטול
          </Link>
        </div>
      </section>
    </div>
  );
}
