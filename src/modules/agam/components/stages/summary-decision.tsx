"use client";

import { useRef, useState, type ReactNode } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { RECOMMENDATION_TONES, STATUS_LABELS, STATUS_TONES } from "@/modules/agam/lib/stages";
import { fieldClass, panelClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type {
  AgamCandidate,
  AgamCandidateStatus,
  AgamCriterion,
  AgamDayEvaluation,
  AgamInterview,
  AgamOrgSettings,
  AgamQuestion,
} from "@/modules/agam/types";

export function SummaryDecision({
  candidate,
  interviews,
  dayEvals,
  preQuestions,
  interviewQuestions,
  criteria,
  org,
  onSaved,
}: {
  candidate: AgamCandidate;
  interviews: AgamInterview[];
  dayEvals: AgamDayEvaluation[];
  preQuestions: AgamQuestion[];
  interviewQuestions: AgamQuestion[];
  criteria: AgamCriterion[];
  org: AgamOrgSettings | null;
  onSaved: () => void;
}) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState(candidate.ramad_notes ?? "");
  const [exporting, setExporting] = useState(false);
  const qData = (candidate.questionnaire_data ?? {}) as Record<string, unknown>;
  const interviewLabelByKey = Object.fromEntries(
    interviewQuestions.map((question) => [question.field_key, question.question_text]),
  );
  const avgScore =
    dayEvals.length > 0
      ? Math.round(
          dayEvals.reduce(
            (sum, evaluation) => sum + (evaluation.final_score ?? evaluation.weighted_score ?? 0),
            0,
          ) / dayEvals.length,
        )
      : null;

  const decide = async (status: Exclude<AgamCandidateStatus, "pending">) => {
    try {
      await agamFetch(`/api/agam/candidates/${candidate.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ramad_notes: notes }),
      });
      toast.success(status === "passed" ? "עבר" : "לא עבר");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "החלטה נכשלה");
    }
  };

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(img, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${candidate.full_name}_${candidate.personal_number}.pdf`);
    } catch {
      toast.error("ייצוא PDF נכשל");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`${panelClass} space-y-4 p-6`}>
        <h2 className="text-2xl font-extrabold text-text-primary">החלטת רמ״ד</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButtonClass} onClick={() => void decide("passed")}>
            עבר
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white"
            onClick={() => void decide("not_passed")}
          >
            לא עבר
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => void exportPdf()}
            disabled={exporting}
          >
            {exporting ? "מייצא…" : "ייצוא PDF"}
          </button>
        </div>
        <textarea
          className={fieldClass}
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={async () => {
            try {
              await agamFetch(`/api/agam/candidates/${candidate.id}`, {
                method: "PATCH",
                body: JSON.stringify({ ramad_notes: notes }),
              });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "שמירת הערות נכשלה");
            }
          }}
          placeholder="הערות אישיות של רמ״ד איתור"
        />
        <p className="text-sm text-text-muted">סטטוס נוכחי: {STATUS_LABELS[candidate.status]}</p>
      </div>

      <div ref={reportRef} dir="rtl" className="space-y-5 rounded-3xl bg-white p-8 text-black">
        <div className="border-b-2 border-slate-800 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={org?.logo_url || "/logo-mador-omtz.png"}
                alt={org?.unit_name ?? "איתור קציני דת"}
                className="h-12 w-12 object-contain"
              />
              <div>
                <p className="text-sm font-bold">
                  {org?.unit_name ?? "מדור איתור"} · יום מיונים קציני דת
                </p>
                <p className="text-xs text-slate-500">
                  תאריך הפקת המסמך: {new Date().toLocaleDateString("he-IL")}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-xs text-slate-500" dir="ltr">
              תיק: {candidate.personal_number}
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold">{candidate.full_name}</h1>
          <p className="text-slate-600" dir="ltr">
            מספר אישי: {candidate.personal_number}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[candidate.status]}`}
            >
              החלטה: {STATUS_LABELS[candidate.status]}
            </span>
            {avgScore != null ? (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                ממוצע ציונים: {avgScore}
              </span>
            ) : null}
          </div>
        </div>

        <ReportBlock title="מידע אישי מהשאלון">
          {preQuestions.map((question) => {
            const value = qData[question.field_key];
            if (value == null || value === "") return null;
            return (
              <DataRow key={question.id} label={question.question_text} value={String(value)} />
            );
          })}
        </ReportBlock>

        <ReportBlock title="ראיונות אישיים">
          {interviews.length === 0 ? (
            <p className="text-sm text-slate-500">אין ראיונות</p>
          ) : (
            interviews.map((interview, index) => (
              <div key={interview.id} className="mb-4 border-b border-slate-100 pb-4 last:border-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold">
                    מעריך {index + 1}: {interview.evaluator_name}
                  </span>
                  {interview.recommendation ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        RECOMMENDATION_TONES[interview.recommendation] ?? "bg-slate-100"
                      }`}
                    >
                      {interview.recommendation}
                    </span>
                  ) : null}
                </div>
                {Object.entries(interview.interview_data ?? {}).map(([key, value]) =>
                  value ? (
                    <div key={key} className="mb-2 text-sm">
                      <p className="text-xs font-semibold text-slate-500">
                        {interviewLabelByKey[key] ?? key}
                      </p>
                      <p className="whitespace-pre-wrap">{String(value)}</p>
                    </div>
                  ) : null,
                )}
                {interview.evaluator_assessment ? (
                  <p className="mt-2 text-sm">
                    <strong>התרשמות:</strong> {interview.evaluator_assessment}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </ReportBlock>

        <ReportBlock title="הערכות יום מיונים">
          {dayEvals.length === 0 ? (
            <p className="text-sm text-slate-500">אין הערכות</p>
          ) : (
            dayEvals.map((evaluation) => (
              <div key={evaluation.id} className="mb-4 border-b border-slate-100 pb-4 last:border-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">{evaluation.evaluator_name}</p>
                  <p className="text-lg font-extrabold">
                    {evaluation.final_score ?? evaluation.weighted_score ?? "—"}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {criteria.map((criterion) => (
                    <div key={criterion.key} className="rounded-lg bg-slate-50 px-2 py-1.5 text-sm">
                      <span className="font-bold">
                        {evaluation.scores_data?.[criterion.key] ?? "—"}
                      </span>
                      <span className="ms-2 text-slate-500">{criterion.name}</span>
                      {evaluation.feedback_data?.[criterion.key] ? (
                        <p className="mt-1 text-xs text-slate-600">
                          {evaluation.feedback_data[criterion.key]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                {evaluation.final_feedback ? (
                  <p className="mt-2 text-sm">{evaluation.final_feedback}</p>
                ) : null}
              </div>
            ))
          )}
        </ReportBlock>

        <ReportBlock title="הערות רמ״ד">
          <p className="whitespace-pre-wrap text-sm">{notes || "—"}</p>
        </ReportBlock>

        <div className="pt-10 text-sm">חתימה: ______________________</div>
      </div>
    </div>
  );
}

function ReportBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-2">
      <h3 className="mb-3 border-b border-slate-200 pb-2 text-base font-bold">{title}</h3>
      {children}
    </section>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-slate-50 py-1.5 text-sm last:border-0">
      <span className="min-w-40 shrink-0 text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
