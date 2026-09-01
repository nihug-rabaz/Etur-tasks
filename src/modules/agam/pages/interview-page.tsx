"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AgamQuestionField } from "@/modules/agam/components/question-field";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { groupQuestionsBySection, isQuestionVisible } from "@/modules/agam/lib/questions";
import { RECOMMENDATIONS } from "@/modules/agam/lib/stages";
import { fieldClass, panelClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamInterview, AgamQuestion, AgamRecommendation } from "@/modules/agam/types";

export function AgamInterviewPage({
  candidateId,
  interviewId,
}: {
  candidateId: string;
  interviewId?: string;
}) {
  const [questions, setQuestions] = useState<AgamQuestion[]>([]);
  const [data, setData] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState("");
  const [recommendation, setRecommendation] = useState<AgamRecommendation | "">("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void agamFetch<{ questions: AgamQuestion[]; interview: AgamInterview | null }>(
      `/api/agam/interviews?candidateId=${candidateId}${interviewId ? `&interviewId=${interviewId}` : ""}`,
    )
      .then((json) => {
        setQuestions(json.questions ?? []);
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

  const onSave = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/interviews", {
        method: "POST",
        body: JSON.stringify({
          candidateId,
          interviewId,
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className={`${panelClass} p-6`}>
        <h1 className="text-3xl font-extrabold text-text-primary">טופס ראיון</h1>
        <Link
          href={`/agam/candidates/${candidateId}?stage=day_selection`}
          className="mt-2 inline-block text-xs font-bold text-accent-primary"
        >
          חזרה ליום המיונים
        </Link>
      </div>
      {sections.map(([num, section]) => {
        const visible = section.items.filter((question) => isQuestionVisible(question, data));
        if (visible.length === 0) return null;
        return (
          <section key={num} className={`${panelClass} space-y-4 p-6`}>
            <h2 className="font-bold text-text-primary">{section.name}</h2>
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
      <section className={`${panelClass} space-y-4 p-6`}>
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          התרשמות והערכת המעריך
          <textarea
            className={fieldClass}
            rows={4}
            placeholder="כתוב התרשמות חופשית מהריאיון..."
            value={assessment}
            onChange={(event) => setAssessment(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {RECOMMENDATIONS.map((item) => (
            <button
              key={item}
              type="button"
              className={recommendation === item ? primaryButtonClass : secondaryButtonClass}
              onClick={() => setRecommendation(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button type="button" className={primaryButtonClass} onClick={() => void onSave()} disabled={saving}>
          {saving ? "שומר…" : "שמירה"}
        </button>
      </section>
    </div>
  );
}
