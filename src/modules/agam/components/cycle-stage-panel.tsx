"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronLeft, X } from "lucide-react";
import type {
  AgamCandidate,
  AgamCycleStageBoard,
  AgamPrepDayEvaluation,
  AgamSmachEvaluation,
  AgamStageKey,
} from "@/modules/agam/types";
import { STATUS_LABELS } from "@/modules/agam/lib/stages";
import { isSportsResultsDocument } from "@/modules/agam/lib/document-types";

function PassPill({ value }: { value: boolean | null | undefined }) {
  if (value == null) return <span className="text-[11px] font-semibold text-text-muted">טרם נקבע</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
        value
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
          : "bg-rose-500/15 text-rose-700 dark:text-rose-200"
      }`}
    >
      {value ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
      {value ? "עבר" : "לא עבר"}
    </span>
  );
}

function ScoreChip({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-2/80 px-2.5 py-2 text-center">
      <p className="text-[10px] font-bold text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold tabular-nums text-text-primary" dir="ltr">
        {value == null || value === "" ? "—" : value}
      </p>
    </div>
  );
}

function CandidateShell({
  candidate,
  cycleId,
  stage,
  badge,
  children,
}: {
  candidate: AgamCandidate;
  cycleId: string;
  stage: AgamStageKey;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl bg-surface-1 p-3.5 shadow-[0_0_0_1px_rgba(22,24,29,0.06)] dark:bg-[#181a22] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/agam/candidates/${candidate.id}?from=${cycleId}&stage=${stage}`}
            className="truncate text-sm font-extrabold text-text-primary transition hover:text-accent-primary"
          >
            {candidate.full_name}
          </Link>
          <p className="text-[11px] font-semibold tabular-nums text-text-muted" dir="ltr">
            {candidate.personal_number}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <Link
            href={`/agam/candidates/${candidate.id}?from=${cycleId}&stage=${stage}`}
            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-text-muted transition hover:text-text-primary"
            aria-label={`פתיחת ${candidate.full_name}`}
          >
            תיק
            <ChevronLeft size={13} />
          </Link>
        </div>
      </div>
      {children}
    </article>
  );
}

function EmptyStage({ label }: { label: string }) {
  return (
    <p className="rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm font-semibold text-text-muted">
      {label}
    </p>
  );
}

function groupByCandidate<T extends { candidate_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.candidate_id) ?? [];
    list.push(row);
    map.set(row.candidate_id, list);
  }
  return map;
}

function DaySelectionPanel({
  candidates,
  cycleId,
  board,
}: {
  candidates: AgamCandidate[];
  cycleId: string;
  board: AgamCycleStageBoard;
}) {
  const evals = groupByCandidate(board.dayEvaluations);
  const interviews = groupByCandidate(board.interviews);
  const rows = candidates.filter((c) => evals.has(c.id) || interviews.has(c.id));
  if (rows.length === 0) return <EmptyStage label="אין עדיין הערכות או ראיונות ביום המיונים." />;

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {rows.map((candidate) => {
        const dayRows = evals.get(candidate.id) ?? [];
        const interviewRows = interviews.get(candidate.id) ?? [];
        const scores = dayRows
          .map((row) => row.final_score ?? row.weighted_score)
          .filter((n): n is number => n != null);
        const avg = scores.length
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null;
        const passed =
          dayRows.find((row) => row.passed != null)?.passed ??
          (dayRows.length === 0 ? null : dayRows.every((row) => row.passed !== false));
        return (
          <CandidateShell
            key={candidate.id}
            candidate={candidate}
            cycleId={cycleId}
            stage="day_selection"
            badge={<PassPill value={passed} />}
          >
            <div className="grid grid-cols-3 gap-1.5">
              <ScoreChip label="ממוצע" value={avg} />
              <ScoreChip label="הערכות" value={dayRows.length || null} />
              <ScoreChip label="ראיונות" value={interviewRows.length || null} />
            </div>
            {interviewRows.some((row) => row.recommendation) ? (
              <ul className="mt-2 space-y-1">
                {interviewRows
                  .filter((row) => row.recommendation)
                  .map((row) => (
                    <li key={row.id} className="truncate text-[11px] font-semibold text-text-secondary">
                      {row.evaluator_name ?? "מעריך"} · {row.recommendation}
                    </li>
                  ))}
              </ul>
            ) : null}
          </CandidateShell>
        );
      })}
    </div>
  );
}

function PrepDayPanel({
  candidates,
  cycleId,
  board,
}: {
  candidates: AgamCandidate[];
  cycleId: string;
  board: AgamCycleStageBoard;
}) {
  const byCandidate = groupByCandidate(board.prepDays);
  const rows = candidates.filter((c) => byCandidate.has(c.id));
  if (rows.length === 0) return <EmptyStage label="אין עדיין הערכות ליום המכין." />;

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {rows.map((candidate) => {
        const evals = byCandidate.get(candidate.id) ?? [];
        const latest = [...evals].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )[0] as AgamPrepDayEvaluation;
        const notes = [
          latest.conversation_feedback ? `שיחה: ${latest.conversation_feedback}` : null,
          latest.social_dynamics_feedback ? `דינמיקה: ${latest.social_dynamics_feedback}` : null,
          latest.general_impression ? `התרשמות: ${latest.general_impression}` : null,
        ].filter(Boolean);
        return (
          <CandidateShell
            key={candidate.id}
            candidate={candidate}
            cycleId={cycleId}
            stage="preparation_day"
            badge={<PassPill value={latest.passed} />}
          >
            <div className="grid grid-cols-3 gap-1.5">
              <ScoreChip label="מקראות" value={latest.mikra_score} />
              <ScoreChip label="שיחה" value={latest.conversation_score} />
              <ScoreChip label="דינמיקה" value={latest.social_dynamics_score} />
            </div>
            {notes.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {notes.map((note) => (
                  <li key={note} className="line-clamp-2 text-[11px] font-semibold leading-relaxed text-text-secondary">
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}
            {evals.length > 1 ? (
              <p className="mt-2 text-[10px] font-bold text-text-muted">{evals.length} הערכות</p>
            ) : null}
          </CandidateShell>
        );
      })}
    </div>
  );
}

function SmachPanel({
  candidates,
  cycleId,
  board,
}: {
  candidates: AgamCandidate[];
  cycleId: string;
  board: AgamCycleStageBoard;
}) {
  const byCandidate = groupByCandidate(board.smach);
  const rows = candidates.filter((c) => byCandidate.has(c.id));
  if (rows.length === 0) return <EmptyStage label="אין עדיין הערכות סמ״ח." />;

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {rows.map((candidate) => {
        const evals = byCandidate.get(candidate.id) ?? [];
        const latest = [...evals].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )[0] as AgamSmachEvaluation;
        return (
          <CandidateShell
            key={candidate.id}
            candidate={candidate}
            cycleId={cycleId}
            stage="smach"
            badge={<PassPill value={latest.passed} />}
          >
            <div className="grid grid-cols-2 gap-1.5">
              <ScoreChip label="ציון משוקלל" value={latest.weighted_score} />
              <ScoreChip label="המלצה" value={latest.decision} />
            </div>
            {latest.key_points ? (
              <p className="mt-2 line-clamp-3 text-[11px] font-semibold leading-relaxed text-text-secondary">
                {latest.key_points}
              </p>
            ) : null}
            {evals.length > 1 ? (
              <p className="mt-2 text-[10px] font-bold text-text-muted">{evals.length} הערכות</p>
            ) : null}
          </CandidateShell>
        );
      })}
    </div>
  );
}

function DocumentsPanel({
  candidates,
  cycleId,
  board,
}: {
  candidates: AgamCandidate[];
  cycleId: string;
  board: AgamCycleStageBoard;
}) {
  const byCandidate = groupByCandidate(board.documents);
  const rows = candidates.filter((c) => byCandidate.has(c.id));
  if (rows.length === 0) return <EmptyStage label="אין מסמכים במחזור עדיין." />;

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {rows.map((candidate) => {
        const docs = (byCandidate.get(candidate.id) ?? []).filter((doc) => !isSportsResultsDocument(doc));
        const approved = docs.filter((doc) => Boolean(doc.approved_at)).length;
        return (
          <CandidateShell key={candidate.id} candidate={candidate} cycleId={cycleId} stage="documents">
            <div className="grid grid-cols-2 gap-1.5">
              <ScoreChip label="מסמכים" value={docs.length} />
              <ScoreChip label="מאושרים" value={approved} />
            </div>
            {docs.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {docs.slice(0, 4).map((doc) => (
                  <li key={doc.id} className="truncate text-[11px] font-semibold text-text-secondary">
                    {doc.document_type || doc.name}
                    {doc.approved_at ? " · אושר" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] font-semibold text-text-muted">רק תמונות ספורט / אין מסמכים</p>
            )}
          </CandidateShell>
        );
      })}
    </div>
  );
}

function FinalDecisionPanel({
  candidates,
  cycleId,
}: {
  candidates: AgamCandidate[];
  cycleId: string;
}) {
  if (candidates.length === 0) return <EmptyStage label="אין מועמדים במחזור." />;
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {candidates.map((candidate) => (
        <CandidateShell
          key={candidate.id}
          candidate={candidate}
          cycleId={cycleId}
          stage="final_decision"
          badge={
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-extrabold text-text-primary">
              {STATUS_LABELS[candidate.status] ?? candidate.status}
            </span>
          }
        >
          <p className="text-[11px] font-semibold leading-relaxed text-text-secondary">
            {candidate.ramad_notes?.trim() || "אין הערת רמ״ד עדיין."}
          </p>
        </CandidateShell>
      ))}
    </div>
  );
}

export function CycleStagePanel({
  stage,
  candidates,
  cycleId,
  board,
  loading,
}: {
  stage: AgamStageKey;
  candidates: AgamCandidate[];
  cycleId: string;
  board: AgamCycleStageBoard | null;
  loading: boolean;
}) {
  if (loading && !board) {
    return <p className="py-8 text-center text-sm font-semibold text-text-muted">טוען נתוני שלב…</p>;
  }
  if (!board) return <EmptyStage label="לא ניתן לטעון את נתוני השלב." />;

  switch (stage) {
    case "day_selection":
      return <DaySelectionPanel candidates={candidates} cycleId={cycleId} board={board} />;
    case "preparation_day":
      return <PrepDayPanel candidates={candidates} cycleId={cycleId} board={board} />;
    case "smach":
      return <SmachPanel candidates={candidates} cycleId={cycleId} board={board} />;
    case "documents":
      return <DocumentsPanel candidates={candidates} cycleId={cycleId} board={board} />;
    case "final_decision":
      return <FinalDecisionPanel candidates={candidates} cycleId={cycleId} />;
    default:
      return null;
  }
}
