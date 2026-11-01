"use client";

import { Award, Check, ClipboardCheck, Pencil, Scale, Target, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CaseRow,
  CaseSectionHead,
  caseCardClass,
} from "@/modules/agam/components/case-file-kit";
import { PassFailBadge, PassFailPicker } from "@/modules/agam/components/pass-fail-picker";
import { ExamPanels, PassMark, buildExamGroups } from "@/modules/agam/components/test-results-cards";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import {
  PROFESSIONAL_CRITERIA,
  SMACH_DECISIONS,
  THRESHOLD_TESTS,
  computeThresholdPass,
  normalizeThresholdTests,
  withAutoThresholdPass,
  type AgamThresholdInputType,
} from "@/modules/agam/lib/stages";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamSmachDecision, AgamSmachEvaluation } from "@/modules/agam/types";

function averageScores(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10;
}

type ThresholdEntry = {
  pass?: boolean | null;
  score?: number | null;
  time?: string | null;
  count?: number | null;
  datum?: string | null;
};

type SmachDraft = {
  thresholdTests: Record<string, ThresholdEntry>;
  professionalScores: Record<string, number>;
  professionalFeedback: Record<string, string>;
  weightedScore: string;
  keyPoints: string;
  decision: AgamSmachDecision | "";
  decisionReasoning: string;
  passed: boolean | null;
};

function draftFrom(evaluation: AgamSmachEvaluation | undefined): SmachDraft {
  return {
    thresholdTests: normalizeThresholdTests(
      (evaluation?.threshold_tests as Record<string, ThresholdEntry> | null) ?? {},
    ),
    professionalScores: evaluation?.professional_scores ?? {},
    professionalFeedback: evaluation?.professional_feedback ?? {},
    weightedScore: evaluation?.weighted_score?.toString() ?? "",
    keyPoints: evaluation?.key_points ?? "",
    decision: evaluation?.decision ?? "",
    decisionReasoning: evaluation?.decision_reasoning ?? "",
    passed: evaluation?.passed ?? null,
  };
}

function valueForTest(entry: ThresholdEntry | undefined, inputType: AgamThresholdInputType): string {
  if (!entry) return "";
  if (inputType === "time") return entry.time ?? entry.datum ?? "";
  if (inputType === "count") {
    if (entry.count != null) return String(entry.count);
    return entry.datum ?? "";
  }
  if (entry.score != null) return String(entry.score);
  return entry.datum ?? "";
}

function thresholdAverage(tests: Record<string, ThresholdEntry>): number | null {
  return averageScores(
    THRESHOLD_TESTS.filter((test) => test.inputType === "score").map((test) => tests[test.key]?.score ?? null),
  );
}

function professionalAverageOf(scores: Record<string, number>): number | null {
  return averageScores(PROFESSIONAL_CRITERIA.map((criterion) => scores[criterion.key]));
}

const subtleDividerClass =
  "shadow-[inset_0_-1px_0_rgba(22,24,29,0.05)] last:shadow-none dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]";

export function SmachStage({
  candidateId,
  evaluations,
  currentUserId,
  canEvaluate,
  onSaved,
}: {
  candidateId: string;
  evaluations: AgamSmachEvaluation[];
  currentUserId: string;
  canEvaluate: boolean;
  onSaved: () => void;
}) {
  const mine = evaluations.find((row) => row.evaluator_id === currentUserId);
  const others = evaluations.filter((row) => row.evaluator_id !== currentUserId);
  const [draft, setDraft] = useState<SmachDraft>(() => draftFrom(mine));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof SmachDraft>(key: K, value: SmachDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const setThresholdValue = (key: string, inputType: AgamThresholdInputType, raw: string) =>
    setDraft((current) => {
      const next: ThresholdEntry = { ...current.thresholdTests[key] };
      if (inputType === "time") next.time = raw || null;
      else if (inputType === "count") next.count = raw === "" ? null : Number(raw);
      else next.score = raw === "" ? null : Number(raw);
      return {
        ...current,
        thresholdTests: { ...current.thresholdTests, [key]: withAutoThresholdPass(key, next) },
      };
    });

  const startEdit = () => {
    setDraft(draftFrom(mine));
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(draftFrom(mine));
    setEditing(false);
  };

  const onSave = async () => {
    if (draft.passed == null) {
      toast.error("נא לבחור עבר או לא עבר");
      return;
    }
    const thresholdTests = Object.fromEntries(
      Object.entries(draft.thresholdTests).map(([key, entry]) => [key, withAutoThresholdPass(key, entry ?? {})]),
    );
    setSaving(true);
    try {
      await agamFetch("/api/agam/smach", {
        method: "POST",
        body: JSON.stringify({
          candidateId,
          thresholdTests,
          professionalScores: draft.professionalScores,
          professionalFeedback: draft.professionalFeedback,
          weightedScore: draft.weightedScore ? Number(draft.weightedScore) : null,
          keyPoints: draft.keyPoints,
          decision: draft.decision || null,
          decisionReasoning: draft.decisionReasoning,
          passed: draft.passed,
        }),
      });
      toast.success("הערכת סמ״ח נשמרה");
      setEditing(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const source = useMemo(() => (editing ? draft : draftFrom(mine)), [editing, draft, mine]);
  const professionalAverage = professionalAverageOf(source.professionalScores);
  const thresholdScoreAverage = thresholdAverage(source.thresholdTests);

  return (
    <div className="space-y-4">
      <section className={`${caseCardClass} flex flex-wrap items-center justify-between gap-4 px-5 py-4`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
            <ClipboardCheck size={20} />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-text-primary">הערכת סמ״ח</h2>
            <p className="text-xs text-text-muted">
              {editing ? "מצב עריכה — השינויים יישמרו רק בלחיצה על שמירה" : "ההערכה שלך כמעריך. כל מעריך ממלא הערכה נפרדת."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!editing ? (
            <>
              <ScoreChip label="מקצועי" value={professionalAverage} suffix="/5" />
              <ScoreChip label="מבחני סף" value={thresholdScoreAverage} />
              <PassFailBadge value={mine?.passed} />
            </>
          ) : null}
          {canEvaluate && !editing ? (
            <button type="button" className={secondaryButtonClass} onClick={startEdit}>
              <Pencil size={14} />
              {mine ? "עריכה" : "מילוי הערכה"}
            </button>
          ) : null}
          {editing ? (
            <>
              <button type="button" className={primaryButtonClass} disabled={saving} onClick={() => void onSave()}>
                <Check size={15} />
                {saving ? "שומר…" : "שמירה"}
              </button>
              <button type="button" className={secondaryButtonClass} disabled={saving} onClick={cancelEdit}>
                <X size={15} />
                ביטול
              </button>
            </>
          ) : null}
        </div>
      </section>

      {editing ? (
        <SmachEditor
          draft={draft}
          update={update}
          setThresholdValue={setThresholdValue}
          professionalAverage={professionalAverage}
          thresholdScoreAverage={thresholdScoreAverage}
        />
      ) : mine ? (
        <SmachEvaluationView evaluation={mine} />
      ) : (
        <section className={`${caseCardClass} px-6 py-10 text-center`}>
          <p className="text-sm font-bold text-text-primary">עדיין לא מילאת הערכת סמ״ח למועמד</p>
          <p className="mt-1 text-xs text-text-muted">
            {canEvaluate ? "לחצו על ״מילוי הערכה״ כדי להתחיל." : "צפייה בלבד."}
          </p>
        </section>
      )}

      {others.length > 0 ? (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-text-secondary">הערכות מעריכים נוספים ({others.length})</h3>
          {others.map((row) => (
            <SmachReadOnlyCard key={row.id} evaluation={row} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ScoreChip({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  if (value == null) return null;
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs">
      <span className="font-semibold text-text-muted">{label}</span>
      <span className="font-extrabold tabular-nums text-text-primary" dir="ltr">
        {value}
        {suffix ? <span className="text-text-muted">{suffix}</span> : null}
      </span>
    </span>
  );
}

function PassPill({ value }: { value: boolean | null | undefined }) {
  if (value == null) return <span className="text-xs font-bold text-text-muted/60">לא סומן</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
        value
          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
          : "bg-rose-500/12 text-rose-700 dark:text-rose-300"
      }`}
    >
      {value ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
      {value ? "עבר" : "לא עבר"}
    </span>
  );
}

function ScoreDots({ value }: { value: number | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((dot) => (
          <span
            key={dot}
            className={`h-2 w-2 rounded-full ${value != null && dot <= value ? "bg-accent-primary" : "bg-surface-2"}`}
          />
        ))}
      </span>
      <span className="text-sm font-extrabold tabular-nums text-text-primary" dir="ltr">
        {value ?? "—"}
        <span className="text-text-muted">/5</span>
      </span>
    </span>
  );
}

function TextBlock({ label, text }: { label: string; text: string | null | undefined }) {
  return (
    <div className="py-2.5">
      <p className="text-[13px] font-semibold text-text-muted">{label}</p>
      <p
        className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
          text ? "font-semibold text-text-primary" : "text-text-muted/60"
        }`}
      >
        {text || "—"}
      </p>
    </div>
  );
}

/** Read-only body of a סמ״ח evaluation — used for the evaluator's own view and for other evaluators. */
function SmachEvaluationView({ evaluation, compact = false }: { evaluation: AgamSmachEvaluation; compact?: boolean }) {
  const tests = normalizeThresholdTests((evaluation.threshold_tests ?? {}) as Record<string, ThresholdEntry>);
  const scores = evaluation.professional_scores ?? {};
  const feedback = evaluation.professional_feedback ?? {};

  return (
    <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-2"}`}>
      <section className={caseCardClass}>
        <CaseSectionHead icon={Target} title="חלק א׳ — מבחני סף" tone="sky" />
        <ExamPanels
          alwaysOpen
          groups={buildExamGroups((test) => {
            const entry = tests[test.key];
            return {
              key: test.key,
              inputType: test.inputType,
              value: valueForTest(entry, test.inputType) || null,
              pass: computeThresholdPass(test.key, entry) ?? entry?.pass ?? null,
            };
          })}
        />
      </section>

      <section className={caseCardClass}>
        <CaseSectionHead icon={Award} title="חלק ב׳ — הערכה מקצועית" tone="emerald" />
        <ul className="px-4 py-1.5">
          {PROFESSIONAL_CRITERIA.map((criterion) => (
            <li key={criterion.key} className={`py-2.5 ${subtleDividerClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-text-muted">{criterion.label}</span>
                <ScoreDots value={scores[criterion.key]} />
              </div>
              {feedback[criterion.key] ? (
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">
                  {feedback[criterion.key]}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className={`${caseCardClass} ${compact ? "" : "lg:col-span-2"}`}>
        <CaseSectionHead icon={Scale} title="סיכום והחלטה" tone="violet" />
        <div className={`grid gap-x-8 px-4 py-1.5 ${compact ? "" : "md:grid-cols-2"}`}>
          <dl>
            <CaseRow label="עבר / לא עבר">
              <dd>
                <PassPill value={evaluation.passed} />
              </dd>
            </CaseRow>
            <CaseRow label="המלצה" value={evaluation.decision ?? ""} />
            <CaseRow label="ציון משוקלל" value={evaluation.weighted_score ?? ""} emphasis />
          </dl>
          <div>
            <TextBlock label="נימוק להחלטה" text={evaluation.decision_reasoning} />
            <TextBlock label="נקודות משמעותיות מתוך התהליך" text={evaluation.key_points} />
          </div>
        </div>
      </section>
    </div>
  );
}

function SmachEditor({
  draft,
  update,
  setThresholdValue,
  professionalAverage,
  thresholdScoreAverage,
}: {
  draft: SmachDraft;
  update: <K extends keyof SmachDraft>(key: K, value: SmachDraft[K]) => void;
  setThresholdValue: (key: string, inputType: AgamThresholdInputType, raw: string) => void;
  professionalAverage: number | null;
  thresholdScoreAverage: number | null;
}) {
  return (
    <div className="space-y-4">
      <section className={caseCardClass}>
        <CaseSectionHead icon={Target} title="חלק א׳ — מבחני סף" tone="sky" />
        <ExamPanels
          alwaysOpen
          groups={buildExamGroups((test) => {
            const entry = draft.thresholdTests[test.key];
            return {
              key: test.key,
              inputType: test.inputType,
              value: valueForTest(entry, test.inputType) || null,
              pass: computeThresholdPass(test.key, entry) ?? entry?.pass ?? null,
            };
          })}
          renderCell={(cell) => (
            <span className="flex items-center gap-1">
              <input
                dir="ltr"
                inputMode={cell.inputType === "time" ? "text" : "numeric"}
                type={cell.inputType === "time" ? "text" : "number"}
                min={cell.inputType === "score" ? 1 : 0}
                max={cell.inputType === "score" ? 100 : undefined}
                placeholder={cell.inputType === "time" ? "12:30" : "—"}
                value={cell.value ?? ""}
                onChange={(event) => setThresholdValue(cell.key, cell.inputType, event.target.value)}
                className="ui-field h-8 w-full min-w-0 rounded-lg bg-surface-2/70 px-1.5 text-center text-sm font-extrabold tabular-nums text-text-primary outline-none"
              />
              <PassMark pass={cell.pass} />
            </span>
          )}
        />
      </section>

      <section className={caseCardClass}>
        <CaseSectionHead icon={Award} title="חלק ב׳ — הערכה מקצועית" tone="emerald" />
        <ul className="grid gap-x-6 px-4 py-1 md:grid-cols-2">
          {PROFESSIONAL_CRITERIA.map((criterion) => (
            <li key={criterion.key} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-text-primary">{criterion.label}</span>
                <Segmented
                  value={draft.professionalScores[criterion.key]?.toString() ?? null}
                  options={[1, 2, 3, 4, 5].map((score) => ({ value: String(score), label: String(score) }))}
                  onChange={(value) =>
                    update("professionalScores", { ...draft.professionalScores, [criterion.key]: Number(value) })
                  }
                  square
                />
              </div>
              <textarea
                className={`${fieldClass} min-h-[2.75rem] resize-y text-[13px]`}
                rows={1}
                placeholder="התרשמות מילולית (לא חובה)"
                value={draft.professionalFeedback[criterion.key] ?? ""}
                onChange={(event) =>
                  update("professionalFeedback", { ...draft.professionalFeedback, [criterion.key]: event.target.value })
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section className={caseCardClass}>
        <CaseSectionHead icon={Scale} title="סיכום והחלטה" tone="violet" />
        <div className="grid gap-5 p-4 md:grid-cols-2">
          <div className="space-y-4">
            <PassFailPicker value={draft.passed} onChange={(value) => update("passed", value)} label="עבר / לא עבר" />
            <EditorField label="המלצה">
              <div className="flex flex-wrap gap-1.5">
                {SMACH_DECISIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      draft.decision === item
                        ? "bg-accent-primary text-white"
                        : "bg-surface-2 text-text-secondary hover:text-text-primary"
                    }`}
                    onClick={() => update("decision", item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </EditorField>
            <EditorField label="ציון משוקלל (0–100)">
              <input
                type="number"
                min={0}
                max={100}
                dir="ltr"
                className="ui-field h-11 w-32 rounded-xl bg-surface-1 px-3 text-center text-lg font-extrabold text-text-primary outline-none"
                placeholder="—"
                value={draft.weightedScore}
                onChange={(event) => update("weightedScore", event.target.value)}
              />
            </EditorField>
          </div>
          <div className="space-y-4">
            <EditorField label="נימוק להחלטה">
              <textarea
                className={fieldClass}
                rows={4}
                placeholder="נימוק מפורט להחלטה…"
                value={draft.decisionReasoning}
                onChange={(event) => update("decisionReasoning", event.target.value)}
              />
            </EditorField>
            <EditorField label="נקודות משמעותיות מתוך התהליך">
              <textarea
                className={fieldClass}
                rows={4}
                placeholder="ריכוז הנקודות המרכזיות שעלו במהלך הסמ״ח…"
                value={draft.keyPoints}
                onChange={(event) => update("keyPoints", event.target.value)}
              />
            </EditorField>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <AverageTile label="ממוצע הערכה מקצועית" hint="סולם 1–5" value={professionalAverage} />
        <AverageTile label="ממוצע מבחני סף מספריים" hint="מקראות · בוחן נשק" value={thresholdScoreAverage} />
      </div>
    </div>
  );
}

function EditorField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-text-muted">{label}</p>
      {children}
    </div>
  );
}

function AverageTile({ label, hint, value }: { label: string; hint: string; value: number | null }) {
  return (
    <div className={`${caseCardClass} flex items-center justify-between gap-3 px-5 py-4`}>
      <div>
        <p className="text-sm font-bold text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{hint}</p>
      </div>
      <p className="text-3xl font-extrabold tabular-nums text-accent-primary" dir="ltr">
        {value ?? "—"}
      </p>
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
  square = false,
}: {
  value: string | null;
  options: Array<{ value: string; label: string; activeClass?: string }>;
  onChange: (value: string) => void;
  square?: boolean;
}) {
  return (
    <span className="inline-flex gap-0.5 rounded-full bg-surface-2 p-0.5">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-8 rounded-full text-xs font-extrabold tabular-nums transition ${square ? "w-8" : "px-3.5"} ${
              active
                ? (option.activeClass ?? "bg-accent-primary text-white") + " shadow-sm"
                : "text-text-secondary hover:bg-surface-1 hover:text-text-primary"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}

export function SmachReadOnlyCard({ evaluation }: { evaluation: AgamSmachEvaluation }) {
  const professionalAverage = professionalAverageOf(evaluation.professional_scores ?? {});

  return (
    <article className="space-y-3 rounded-2xl bg-surface-2/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <p className="text-sm font-extrabold text-text-primary">{evaluation.evaluator_name ?? "מעריך"}</p>
          <p className="text-[11px] text-text-muted">{new Date(evaluation.created_at).toLocaleDateString("he-IL")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ScoreChip label="ממוצע" value={professionalAverage} suffix="/5" />
          <PassFailBadge value={evaluation.passed} />
        </div>
      </div>
      <SmachEvaluationView evaluation={evaluation} compact />
    </article>
  );
}
