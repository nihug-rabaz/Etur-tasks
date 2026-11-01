"use client";

import { BookOpen, Check, ClipboardCheck, MessagesSquare, Pencil, Scale, Users, X } from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { CaseRow, CaseSectionHead, caseCardClass, type CaseTone } from "@/modules/agam/components/case-file-kit";
import { PassFailBadge, PassFailPicker } from "@/modules/agam/components/pass-fail-picker";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamPrepDayEvaluation } from "@/modules/agam/types";

function averageScores(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10;
}

type PrepDraft = {
  mikraScore: string;
  conversationScore: string;
  conversationFeedback: string;
  socialDynamicsScore: string;
  socialDynamicsFeedback: string;
  generalImpression: string;
  passed: boolean | null;
};

function draftFrom(evaluation: AgamPrepDayEvaluation | undefined): PrepDraft {
  return {
    mikraScore: evaluation?.mikra_score?.toString() ?? "",
    conversationScore: evaluation?.conversation_score?.toString() ?? "",
    conversationFeedback: evaluation?.conversation_feedback ?? "",
    socialDynamicsScore: evaluation?.social_dynamics_score?.toString() ?? "",
    socialDynamicsFeedback: evaluation?.social_dynamics_feedback ?? "",
    generalImpression: evaluation?.general_impression ?? "",
    passed: evaluation?.passed ?? null,
  };
}

const toNumber = (value: string) => (value ? Number(value) : null);

function draftAverage(draft: PrepDraft): number | null {
  return averageScores([
    toNumber(draft.mikraScore),
    toNumber(draft.conversationScore),
    toNumber(draft.socialDynamicsScore),
  ]);
}

type Criterion = {
  key: "mikra" | "conversation" | "social";
  title: string;
  hint: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone: CaseTone;
  scoreKey: "mikraScore" | "conversationScore" | "socialDynamicsScore";
  feedbackKey?: "conversationFeedback" | "socialDynamicsFeedback";
};

const CRITERIA: Criterion[] = [
  {
    key: "mikra",
    title: "מבחן ״מקראות ישראל״",
    hint: "ציון בלבד",
    icon: BookOpen,
    tone: "sky",
    scoreKey: "mikraScore",
  },
  {
    key: "conversation",
    title: "התנסות בהעברת שיחה",
    hint: "ציון והתרשמות",
    icon: MessagesSquare,
    tone: "emerald",
    scoreKey: "conversationScore",
    feedbackKey: "conversationFeedback",
  },
  {
    key: "social",
    title: "דינמיקות חברתיות",
    hint: "ציון והתרשמות",
    icon: Users,
    tone: "amber",
    scoreKey: "socialDynamicsScore",
    feedbackKey: "socialDynamicsFeedback",
  },
];

export function PreparationDayStage({
  candidateId,
  evaluations,
  currentUserId,
  canEvaluate,
  onSaved,
}: {
  candidateId: string;
  evaluations: AgamPrepDayEvaluation[];
  currentUserId: string;
  canEvaluate: boolean;
  onSaved: () => void;
}) {
  const mine = evaluations.find((row) => row.evaluator_id === currentUserId);
  const others = evaluations.filter((row) => row.evaluator_id !== currentUserId);
  const [draft, setDraft] = useState<PrepDraft>(() => draftFrom(mine));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const saved = useMemo(() => draftFrom(mine), [mine]);
  const shown = editing ? draft : saved;
  const average = draftAverage(shown);

  const update = <K extends keyof PrepDraft>(key: K, value: PrepDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

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
    setSaving(true);
    try {
      await agamFetch("/api/agam/prep-day", {
        method: "POST",
        body: JSON.stringify({
          candidateId,
          mikraScore: toNumber(draft.mikraScore),
          conversationScore: toNumber(draft.conversationScore),
          conversationFeedback: draft.conversationFeedback,
          socialDynamicsScore: toNumber(draft.socialDynamicsScore),
          socialDynamicsFeedback: draft.socialDynamicsFeedback,
          generalImpression: draft.generalImpression,
          passed: draft.passed,
        }),
      });
      toast.success("היום המכין נשמר");
      setEditing(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className={`${caseCardClass} flex flex-wrap items-center justify-between gap-4 px-5 py-4`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
            <ClipboardCheck size={20} />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-text-primary">הערכת היום המכין</h2>
            <p className="text-xs text-text-muted">
              {editing
                ? "מצב עריכה — השינויים יישמרו רק בלחיצה על שמירה"
                : "ההערכה שלך כמעריך. כל מעריך ממלא הערכה נפרדת."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!editing ? (
            <>
              {average != null ? (
                <span className="inline-flex items-baseline gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs">
                  <span className="font-semibold text-text-muted">ממוצע</span>
                  <span className="font-extrabold tabular-nums text-text-primary" dir="ltr">
                    {average}
                  </span>
                </span>
              ) : null}
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

      {!mine && !editing ? (
        <section className={`${caseCardClass} px-6 py-10 text-center`}>
          <p className="text-sm font-bold text-text-primary">עדיין לא מילאת הערכת יום מכין למועמד</p>
          <p className="mt-1 text-xs text-text-muted">
            {canEvaluate ? "לחצו על ״מילוי הערכה״ כדי להתחיל." : "צפייה בלבד."}
          </p>
        </section>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {CRITERIA.map((criterion) => (
              <section key={criterion.key} className={`${caseCardClass} flex flex-col`}>
                <CaseSectionHead icon={criterion.icon} title={criterion.title} tone={criterion.tone} />
                <div className="flex flex-1 flex-col gap-3 p-4">
                  {editing ? (
                    <>
                      <label className="flex items-center justify-between gap-3">
                        <span className="text-[13px] font-semibold text-text-muted">ציון (1–100)</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          dir="ltr"
                          className="ui-field h-11 w-24 rounded-xl bg-surface-1 px-2 text-center text-lg font-extrabold text-text-primary outline-none"
                          placeholder="—"
                          value={draft[criterion.scoreKey]}
                          onChange={(event) => update(criterion.scoreKey, event.target.value)}
                        />
                      </label>
                      {criterion.feedbackKey ? (
                        <textarea
                          className={`${fieldClass} flex-1 text-[13px]`}
                          rows={3}
                          placeholder="התרשמות מילולית (לא חובה)"
                          value={draft[criterion.feedbackKey]}
                          onChange={(event) => update(criterion.feedbackKey!, event.target.value)}
                        />
                      ) : (
                        <p className="text-xs text-text-muted">{criterion.hint}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <ScoreMeter value={toNumber(shown[criterion.scoreKey])} />
                      {criterion.feedbackKey ? (
                        <p
                          className={`whitespace-pre-wrap text-sm leading-relaxed ${
                            shown[criterion.feedbackKey] ? "font-semibold text-text-primary" : "text-text-muted/60"
                          }`}
                        >
                          {shown[criterion.feedbackKey] || "אין התרשמות מילולית"}
                        </p>
                      ) : (
                        <p className="text-xs text-text-muted">{criterion.hint}</p>
                      )}
                    </>
                  )}
                </div>
              </section>
            ))}
          </div>

          <section className={caseCardClass}>
            <CaseSectionHead icon={Scale} title="סיכום והחלטה" tone="violet" />
            <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold text-text-muted">התרשמות כללית מהמועמד לאורך היום</p>
                {editing ? (
                  <textarea
                    className={fieldClass}
                    rows={5}
                    placeholder="סיכום חופשי של ההתרשמות מהמועמד לאורך היום…"
                    value={draft.generalImpression}
                    onChange={(event) => update("generalImpression", event.target.value)}
                  />
                ) : (
                  <p
                    className={`whitespace-pre-wrap text-sm leading-relaxed ${
                      shown.generalImpression ? "font-semibold text-text-primary" : "text-text-muted/60"
                    }`}
                  >
                    {shown.generalImpression || "—"}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {editing ? (
                  <PassFailPicker value={draft.passed} onChange={(value) => update("passed", value)} label="עבר / לא עבר" />
                ) : (
                  <dl>
                    <CaseRow label="עבר / לא עבר">
                      <dd>
                        <PassFailBadge value={shown.passed} />
                        {shown.passed == null ? (
                          <span className="text-xs font-bold text-text-muted/60">לא סומן</span>
                        ) : null}
                      </dd>
                    </CaseRow>
                  </dl>
                )}
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent-primary/[0.07] px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-text-primary">ממוצע ציונים</p>
                    <p className="text-[11px] text-text-muted">מקראות · שיחה · דינמיקות</p>
                  </div>
                  <p className="text-3xl font-extrabold tabular-nums text-accent-primary" dir="ltr">
                    {average ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {others.length > 0 ? (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-text-secondary">הערכות מעריכים נוספים ({others.length})</h3>
          {others.map((row) => (
            <PrepReadOnlyCard key={row.id} evaluation={row} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ScoreMeter({ value }: { value: number | null }) {
  const percent = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-text-muted">ציון</span>
        <span className="text-2xl font-extrabold tabular-nums text-text-primary" dir="ltr">
          {value ?? "—"}
          {value != null ? <span className="text-sm text-text-muted">/100</span> : null}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function PrepReadOnlyCard({ evaluation }: { evaluation: AgamPrepDayEvaluation }) {
  const scores = [
    { label: "מקראות ישראל", value: evaluation.mikra_score, feedback: null },
    { label: "העברת שיחה", value: evaluation.conversation_score, feedback: evaluation.conversation_feedback },
    { label: "דינמיקות חברתיות", value: evaluation.social_dynamics_score, feedback: evaluation.social_dynamics_feedback },
  ];
  const average = averageScores(scores.map((score) => score.value));

  return (
    <article className={caseCardClass}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
        <div>
          <p className="text-sm font-extrabold text-text-primary">{evaluation.evaluator_name ?? "מעריך"}</p>
          <p className="text-[11px] text-text-muted">{new Date(evaluation.created_at).toLocaleDateString("he-IL")}</p>
        </div>
        <div className="flex items-center gap-2">
          {average != null ? (
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-extrabold tabular-nums text-text-primary" dir="ltr">
              ממוצע {average}
            </span>
          ) : null}
          <PassFailBadge value={evaluation.passed} />
        </div>
      </div>
      <div className="grid gap-4 px-5 pb-4 shadow-[inset_0_1px_0_rgba(22,24,29,0.05)] sm:grid-cols-3 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {scores.map((score) => (
          <div key={score.label} className="space-y-2 pt-4">
            <p className="text-xs font-bold text-text-primary">{score.label}</p>
            <ScoreMeter value={score.value ?? null} />
            {score.feedback ? (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">{score.feedback}</p>
            ) : null}
          </div>
        ))}
      </div>
      {evaluation.general_impression ? (
        <div className="px-5 py-3.5 shadow-[inset_0_1px_0_rgba(22,24,29,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-xs font-bold text-text-muted">התרשמות כללית</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{evaluation.general_impression}</p>
        </div>
      ) : null}
    </article>
  );
}
