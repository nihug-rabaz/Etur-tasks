"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, Lock, Pencil, Phone, Plus } from "lucide-react";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { EVALUATOR_ENTRIES, entryTone, type EvaluatorEntryMeta } from "@/modules/agam/lib/evaluator-entries";
import {
  pageShellClass,
  panelClass,
  panelPadClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/agam/lib/ui";
import type {
  EvaluatorCandidateView,
  EvaluatorEntryKind,
  EvaluatorEntryState,
} from "@/modules/agam/services/evaluator-portal.service";
import type { AgamRecommendation } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";
import { AgamInterviewPage } from "@/modules/agam/pages/interview-page";
import { AgamEvaluationPage } from "@/modules/agam/pages/evaluation-page";
import { PreparationDayStage } from "@/modules/agam/components/stages/preparation-day-stage";
import { SmachStage } from "@/modules/agam/components/stages/smach-stage";

type ViewPayload = EvaluatorCandidateView & {
  me: { id: string; name: string | null; role: ModuleRole };
  canEvaluate: boolean;
};

const FORM_KINDS = new Set<EvaluatorEntryKind>(["interview", "evaluation", "prep", "smach"]);

const SCORE_LABEL: Record<EvaluatorEntryKind, string> = {
  interview: "",
  evaluation: "ציון",
  prep: "מקראות",
  smach: "ציון ממוצע",
};

const RECOMMENDATION_DOT: Record<AgamRecommendation, string> = {
  ממליץ: "bg-emerald-500",
  "ממליץ בהסתייגות": "bg-amber-500",
  "לא ממליץ": "bg-rose-500",
};

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function entrySummary(
  meta: EvaluatorEntryMeta,
  entry: EvaluatorEntryState,
  recommendation: AgamRecommendation | null,
): { text: string; detail: string[] } {
  const tone = entryTone(entry);
  const detail: string[] = [];
  if (meta.shared) {
    if (tone === "empty") return { text: "טרם בוצע ראיון", detail };
    if (recommendation) detail.push(recommendation);
    if (entry.updatedAt) detail.push(`עודכן ${formatAgamDate(entry.updatedAt)}`);
    return { text: tone === "mine" ? "מילאת את הראיון" : `בוצע ע״י ${entry.by ?? "מעריך אחר"}`, detail };
  }
  const others = entry.count - (entry.mineId ? 1 : 0);
  if (tone === "mine") {
    if (entry.score != null) detail.push(`${SCORE_LABEL[meta.kind]} ${formatScore(entry.score)}`);
    if (entry.passed != null) detail.push(entry.passed ? "עבר" : "לא עבר");
    if (entry.updatedAt) detail.push(`עודכן ${formatAgamDate(entry.updatedAt)}`);
  }
  if (others > 0) detail.push(others === 1 ? "מעריך נוסף מילא" : `${others} מעריכים נוספים מילאו`);
  return { text: tone === "mine" ? "ההערכה שלך נשמרה" : "טרם הוספת הערכה", detail };
}

function EntryRow({
  meta,
  entry,
  date,
  recommendation,
  canEvaluate,
  onOpen,
}: {
  meta: EvaluatorEntryMeta;
  entry: EvaluatorEntryState;
  date: string | null;
  recommendation: AgamRecommendation | null;
  canEvaluate: boolean;
  onOpen: () => void;
}) {
  const tone = entryTone(entry);
  const Icon = meta.icon;
  const lockedByOther = meta.shared && tone === "others";
  const summary = entrySummary(meta, entry, recommendation);

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5 [&:not(:first-child)]:shadow-[inset_0_1px_0_rgba(20,33,43,0.06)] dark:[&:not(:first-child)]:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            tone === "mine"
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              : "bg-surface-2 text-text-secondary"
          }`}
        >
          {tone === "mine" ? <Check size={17} strokeWidth={2.5} /> : <Icon size={17} />}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-extrabold text-text-primary">
            {meta.title}
            {date ? (
              <span className="text-[11px] font-semibold tabular-nums text-text-muted">{formatAgamDate(date)}</span>
            ) : null}
          </p>
          <p
            className={`mt-0.5 text-xs font-bold ${
              tone === "mine" ? "text-emerald-700 dark:text-emerald-300" : "text-text-secondary"
            }`}
          >
            {summary.text}
          </p>
          {summary.detail.length > 0 ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-text-muted">
              {meta.shared && recommendation && tone !== "empty" ? (
                <span className={`h-1.5 w-1.5 rounded-full ${RECOMMENDATION_DOT[recommendation]}`} />
              ) : null}
              {summary.detail.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      {canEvaluate ? (
        lockedByOther ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-text-muted sm:max-w-[11rem]">
            <Lock size={12} className="shrink-0" />
            רק כותב הראיון יכול לערוך
          </span>
        ) : tone === "mine" ? (
          <button type="button" onClick={onOpen} className={`${secondaryButtonClass} shrink-0 sm:w-36`}>
            <Pencil size={14} />
            עריכה
          </button>
        ) : (
          <button type="button" onClick={onOpen} className={`${primaryButtonClass} shrink-0 sm:w-36`}>
            <Plus size={15} />
            {meta.shared ? "מילוי ראיון" : "הוספת הערכה"}
          </button>
        )
      ) : null}
    </li>
  );
}

function BackLink() {
  return (
    <Link
      href="/agam/evaluate"
      className="inline-flex w-fit items-center gap-1.5 px-1 text-xs font-bold text-text-muted transition hover:text-text-primary"
    >
      <ArrowRight size={14} />
      חזרה למחזור
    </Link>
  );
}

function FormBody({
  form,
  candidateId,
  payload,
  onDone,
}: {
  form: EvaluatorEntryKind;
  candidateId: string;
  payload: ViewPayload;
  onDone: (saved: boolean) => void;
}) {
  const { entries, me } = payload;
  if (form === "interview") {
    return (
      <AgamInterviewPage
        candidateId={candidateId}
        interviewId={entries.interview.mineId ?? undefined}
        embedded
        onDone={onDone}
      />
    );
  }
  if (form === "evaluation") {
    return (
      <AgamEvaluationPage
        candidateId={candidateId}
        evalId={entries.evaluation.mineId ?? undefined}
        embedded
        onDone={onDone}
      />
    );
  }
  if (form === "prep") {
    return (
      <PreparationDayStage
        candidateId={candidateId}
        evaluations={payload.myPrep ? [payload.myPrep] : []}
        currentUserId={me.id}
        canEvaluate={payload.canEvaluate}
        onSaved={() => onDone(true)}
        formOnly
        onClose={() => onDone(true)}
      />
    );
  }
  return (
    <SmachStage
      candidateId={candidateId}
      evaluations={payload.mySmach ? [payload.mySmach] : []}
      currentUserId={me.id}
      canEvaluate={payload.canEvaluate}
      onSaved={() => onDone(true)}
      formOnly
      onClose={() => onDone(true)}
    />
  );
}

export function AgamEvaluatorCandidatePage({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [payload, setPayload] = useState<ViewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requested = searchParams.get("form");
  const form =
    requested && FORM_KINDS.has(requested as EvaluatorEntryKind) ? (requested as EvaluatorEntryKind) : null;

  const load = useCallback(async () => {
    try {
      setPayload(await agamFetch<ViewPayload>(`/api/agam/evaluate/${candidateId}`));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "טעינת המועמד נכשלה");
    }
  }, [candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openForm = (kind: EvaluatorEntryKind) => {
    router.push(`/agam/evaluate/${candidateId}?form=${kind}`);
  };

  const closeForm = (saved = false) => {
    if (saved) void load();
    router.replace(`/agam/evaluate/${candidateId}`);
  };

  if (error) {
    return (
      <div className={pageShellClass} dir="rtl">
        <BackLink />
        <div className={`${panelClass} ${panelPadClass} text-center`}>
          <p className="text-sm font-extrabold text-text-primary">המועמד לא זמין</p>
          <p className="mt-1 text-xs text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!payload) return <p className="p-6 text-sm text-text-muted">טוען…</p>;

  const { candidate, cycle, entries } = payload;
  const doneCount = EVALUATOR_ENTRIES.filter((meta) => entries[meta.kind].mineId).length;
  const commander = [candidate.direct_commander_role, candidate.direct_commander_name].filter(Boolean).join(" ");
  const formMeta = form ? EVALUATOR_ENTRIES.find((meta) => meta.kind === form) ?? null : null;
  const cycleName = cycle.cohort_year ? `${cycle.name} ${cycle.cohort_year}` : cycle.name;

  if (form && formMeta) {
    return (
      <div className={pageShellClass} dir="rtl">
        <button
          type="button"
          onClick={() => closeForm(false)}
          className="inline-flex w-fit items-center gap-1.5 px-1 text-xs font-bold text-text-muted transition hover:text-text-primary"
        >
          <ArrowRight size={14} />
          חזרה לתיק {candidate.full_name}
        </button>

        <header className={`${panelClass} ${panelPadClass}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            {formMeta.title} · מחזור {cycleName}
          </p>
          <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-text-primary">
            {candidate.full_name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            <span dir="ltr" className="tabular-nums">
              {candidate.personal_number}
            </span>
            {candidate.command ? ` · ${candidate.command}` : ""}
          </p>
        </header>

        <section className={`${panelClass} ${panelPadClass}`}>
          <FormBody form={form} candidateId={candidateId} payload={payload} onDone={closeForm} />
        </section>
      </div>
    );
  }

  return (
    <div className={pageShellClass} dir="rtl">
      <BackLink />

      <header className={`${panelClass} ${panelPadClass}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              מחזור {cycleName}
            </p>
            <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-text-primary sm:text-[1.85rem]">
              {candidate.full_name}
            </h1>
            <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-text-secondary">
              <span dir="ltr" className="tabular-nums">
                {candidate.personal_number}
              </span>
              {candidate.command ? <span>· {candidate.command}</span> : null}
              {commander ? <span>· מפקד: {commander}</span> : null}
            </p>
          </div>
          {candidate.phone ? (
            <a href={`tel:${candidate.phone}`} className={secondaryButtonClass}>
              <Phone size={14} />
              <span dir="ltr" className="tabular-nums">
                {candidate.phone}
              </span>
            </a>
          ) : null}
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl bg-surface-1 shadow-[0_0_0_1px_rgba(20,33,43,0.07),0_8px_24px_rgba(20,33,43,0.04)] dark:bg-[#181a22] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between gap-3 bg-surface-2/60 px-4 py-2.5 sm:px-5">
          <h2 className="text-[11px] font-extrabold text-text-muted">ההערכות שלי</h2>
          <span className="text-[11px] font-extrabold tabular-nums text-text-muted">
            {doneCount} מתוך {EVALUATOR_ENTRIES.length}
          </span>
        </div>
        <ul>
          {EVALUATOR_ENTRIES.map((meta) => (
            <EntryRow
              key={meta.kind}
              meta={meta}
              entry={entries[meta.kind]}
              date={meta.date(cycle)}
              recommendation={payload.interviewRecommendation}
              canEvaluate={payload.canEvaluate}
              onOpen={() => openForm(meta.kind)}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
