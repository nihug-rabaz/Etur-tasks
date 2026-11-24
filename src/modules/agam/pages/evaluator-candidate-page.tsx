"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CalendarDays, Check, Lock, Pencil, Phone, Plus, ShieldAlert, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import {
  EVALUATOR_ENTRIES,
  avatarTone,
  entryTone,
  initials,
  type EvaluatorEntryMeta,
} from "@/modules/agam/lib/evaluator-entries";
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

const SCORE_LABEL: Record<EvaluatorEntryKind, string> = {
  interview: "",
  evaluation: "ציון",
  prep: "מקראות",
  smach: "ציון משוקלל",
};

const RECOMMENDATION_TONE: Record<AgamRecommendation, string> = {
  ממליץ: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  "ממליץ בהסתייגות": "bg-amber-500/14 text-amber-700 dark:text-amber-300",
  "לא ממליץ": "bg-rose-500/12 text-rose-700 dark:text-rose-300",
};

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-extrabold ${className}`}>
      {children}
    </span>
  );
}

function EntryCard({
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
  const others = meta.shared ? 0 : entry.count - (entry.mineId ? 1 : 0);

  let headline: string;
  if (tone === "mine") headline = meta.shared ? "מילאת את הראיון" : "ההערכה שלך נשמרה";
  else if (lockedByOther) headline = `בוצע ע״י ${entry.by ?? "מעריך אחר"}`;
  else headline = meta.shared ? "טרם בוצע ראיון" : "טרם הוספת הערכה";

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-[22px] bg-surface-1 p-4 shadow-[0_0_0_1px_rgba(22,24,29,0.05),0_10px_30px_-24px_rgba(22,24,29,0.4)] transition dark:bg-[#1a1c24] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07)] sm:p-5 ${
        tone === "mine" ? "ring-1 ring-emerald-500/30" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.tile}`}>
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-extrabold text-text-primary">{meta.title}</h3>
            {tone === "mine" ? (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check size={12} strokeWidth={3} />
              </span>
            ) : null}
          </div>
          {date ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-text-muted">
              <CalendarDays size={11} />
              <span className="tabular-nums">{formatAgamDate(date)}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3.5 flex-1">
        <p
          className={`text-[13px] font-bold ${
            tone === "mine" ? "text-emerald-700 dark:text-emerald-300" : "text-text-secondary"
          }`}
        >
          {headline}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {meta.shared && recommendation && tone !== "empty" ? (
            <Pill className={RECOMMENDATION_TONE[recommendation]}>{recommendation}</Pill>
          ) : null}
          {!meta.shared && tone === "mine" && entry.score != null ? (
            <Pill className="bg-surface-2 text-text-primary">
              {SCORE_LABEL[meta.kind]} <span className="tabular-nums">{formatScore(entry.score)}</span>
            </Pill>
          ) : null}
          {!meta.shared && tone === "mine" && entry.passed != null ? (
            <Pill
              className={
                entry.passed
                  ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/12 text-rose-700 dark:text-rose-300"
              }
            >
              {entry.passed ? "עבר" : "לא עבר"}
            </Pill>
          ) : null}
          {others > 0 ? (
            <Pill className="bg-sky-500/10 text-sky-700 dark:text-sky-300">
              {others === 1 ? "מעריך נוסף מילא" : `${others} מעריכים נוספים מילאו`}
            </Pill>
          ) : null}
          {tone !== "empty" && entry.updatedAt && (tone === "mine" || meta.shared) ? (
            <span className="self-center text-[11px] font-semibold text-text-muted">
              עודכן {formatAgamDate(entry.updatedAt)}
            </span>
          ) : null}
        </div>
      </div>

      {canEvaluate ? (
        lockedByOther ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-surface-2/70 px-3 py-2.5 text-[12px] font-bold text-text-muted">
            <Lock size={13} />
            רק מי שכתב את הראיון יכול לערוך אותו
          </p>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className={`mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-extrabold transition ${
              tone === "mine"
                ? "bg-surface-2 text-text-primary hover:bg-surface-2/70"
                : "bg-text-primary text-surface-1 shadow-[0_10px_24px_-14px_rgba(22,24,29,0.6)] hover:opacity-90"
            }`}
          >
            {tone === "mine" ? <Pencil size={15} /> : <Plus size={16} />}
            {tone === "mine"
              ? meta.shared
                ? "עריכת הראיון"
                : "עריכת ההערכה שלי"
              : meta.shared
                ? "מילוי ראיון"
                : "הוספת הערכה"}
          </button>
        )
      ) : null}
    </article>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-5 w-28 animate-pulse rounded-full bg-surface-1/70" />
      <div className="h-36 animate-pulse rounded-[28px] bg-surface-1/70" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-[22px] bg-surface-1/70" />
        ))}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/agam/evaluate"
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-1 text-[13px] font-extrabold text-text-muted transition hover:text-text-primary"
    >
      <ArrowRight size={15} />
      חזרה למחזור
    </Link>
  );
}

export function AgamEvaluatorCandidatePage({ candidateId }: { candidateId: string }) {
  const [payload, setPayload] = useState<ViewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EvaluatorEntryKind | null>(null);

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

  const closeForm = (saved = false) => {
    setForm(null);
    if (saved) void load();
  };

  if (error) {
    return (
      <div className="flex flex-col gap-4" dir="rtl">
        <BackLink />
        <div className="flex flex-col items-center rounded-[24px] bg-surface-1/80 px-6 py-14 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-700 dark:text-amber-300">
            <ShieldAlert size={26} />
          </span>
          <p className="mt-4 text-base font-extrabold text-text-primary">המועמד לא זמין</p>
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!payload) return <PageSkeleton />;

  const { candidate, cycle, entries, me } = payload;
  const doneCount = EVALUATOR_ENTRIES.filter((meta) => entries[meta.kind].mineId).length;
  const commander = [candidate.direct_commander_role, candidate.direct_commander_name].filter(Boolean).join(" · ");
  const formMeta = form ? EVALUATOR_ENTRIES.find((meta) => meta.kind === form) ?? null : null;

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      <BackLink />

      <section className="relative overflow-hidden rounded-[28px] bg-surface-1 p-5 shadow-[0_0_0_1px_rgba(22,24,29,0.05),0_24px_60px_-34px_rgba(22,24,29,0.45)] dark:bg-[#1a1c24] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07)] sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-bl from-emerald-500/15 via-sky-500/10 to-transparent"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <span
            className={`inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br ${avatarTone(candidate.id)} text-xl font-black text-white shadow-md`}
          >
            {initials(candidate.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
              מחזור {cycle.cohort_year ? `${cycle.name} ${cycle.cohort_year}` : cycle.name}
            </span>
            <h1 className="mt-1.5 truncate text-[1.6rem] font-black leading-tight tracking-tight text-text-primary">
              {candidate.full_name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-text-muted">
              <span dir="ltr" className="tabular-nums">
                {candidate.personal_number}
              </span>
              {candidate.command ? <span>{candidate.command}</span> : null}
              {commander ? (
                <span className="inline-flex items-center gap-1">
                  <UserRound size={12} />
                  {commander}
                </span>
              ) : null}
            </div>
          </div>
          {candidate.phone ? (
            <a
              href={`tel:${candidate.phone}`}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-surface-2 px-4 text-[13px] font-extrabold text-text-primary transition hover:bg-surface-2/70"
            >
              <Phone size={15} />
              <span dir="ltr" className="tabular-nums">
                {candidate.phone}
              </span>
            </a>
          ) : null}
        </div>
      </section>

      <div className="flex items-end justify-between gap-3 px-1 pt-1">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-primary">ההערכות שלי</h2>
          <p className="text-[12px] font-semibold text-text-muted">
            {payload.canEvaluate ? "הוסיפו או עדכנו את מה שמילאתם על המועמד" : "צפייה בלבד"}
          </p>
        </div>
        <span className="rounded-full bg-surface-1 px-2.5 py-1 text-[12px] font-extrabold tabular-nums text-text-secondary shadow-[0_0_0_1px_rgba(22,24,29,0.05)]">
          {doneCount}/{EVALUATOR_ENTRIES.length}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {EVALUATOR_ENTRIES.map((meta) => (
          <EntryCard
            key={meta.kind}
            meta={meta}
            entry={entries[meta.kind]}
            date={meta.date(cycle)}
            recommendation={payload.interviewRecommendation}
            canEvaluate={payload.canEvaluate}
            onOpen={() => setForm(meta.kind)}
          />
        ))}
      </div>

      <Modal
        open={form != null}
        onClose={() => closeForm()}
        title={formMeta?.title ?? ""}
        subtitle={candidate.full_name}
        size="lg"
      >
        {form === "interview" ? (
          <AgamInterviewPage
            candidateId={candidateId}
            interviewId={entries.interview.mineId ?? undefined}
            embedded
            onDone={closeForm}
          />
        ) : form === "evaluation" ? (
          <AgamEvaluationPage
            candidateId={candidateId}
            evalId={entries.evaluation.mineId ?? undefined}
            embedded
            onDone={closeForm}
          />
        ) : form === "prep" ? (
          <PreparationDayStage
            candidateId={candidateId}
            evaluations={payload.myPrep ? [payload.myPrep] : []}
            currentUserId={me.id}
            canEvaluate={payload.canEvaluate}
            onSaved={() => void load()}
            formOnly
            onClose={() => closeForm()}
          />
        ) : form === "smach" ? (
          <SmachStage
            candidateId={candidateId}
            evaluations={payload.mySmach ? [payload.mySmach] : []}
            currentUserId={me.id}
            canEvaluate={payload.canEvaluate}
            onSaved={() => void load()}
            formOnly
            onClose={() => closeForm()}
          />
        ) : null}
      </Modal>
    </div>
  );
}
