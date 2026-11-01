"use client";

import Link from "next/link";
import { ChevronLeft, Lock, Route, UserCheck } from "lucide-react";
import { CaseSectionHead, caseCardClass } from "@/modules/agam/components/case-file-kit";
import type {
  AgamDayEvaluation,
  AgamInterview,
  AgamPrepDayEvaluation,
  AgamSmachEvaluation,
} from "@/modules/agam/types";

const rowDividerClass =
  "shadow-[inset_0_-1px_0_rgba(22,24,29,0.05)] last:shadow-none dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]";

export function ChronoStageBlocks({
  candidateId,
  interviews,
  evaluations,
  prepDays,
  smach,
}: {
  candidateId: string;
  interviews: AgamInterview[];
  evaluations: AgamDayEvaluation[];
  prepDays: AgamPrepDayEvaluation[];
  smach: AgamSmachEvaluation[];
}) {
  const interviewSummary =
    interviews.length === 0
      ? "אין ראיונות"
      : interviews
          .map((row) => row.recommendation ?? "ללא המלצה")
          .slice(0, 3)
          .join(" · ");

  const dayAvg =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce(
            (sum, row) => sum + (row.final_score ?? row.weighted_score ?? 0),
            0,
          ) / evaluations.length,
        )
      : null;

  const prepSummary =
    prepDays.length === 0
      ? "אין הערכות"
      : `${prepDays.length} הערכות · ${prepDays.filter((row) => row.general_impression).length} עם התרשמות`;

  const smachSummary =
    smach.length === 0
      ? "אין הערכות"
      : smach.map((row) => row.decision ?? "ללא החלטה").slice(0, 2).join(" · ");

  const blocks = [
    {
      title: "ראיון",
      href: `/agam/candidates/${candidateId}?stage=day_selection`,
      metric: interviewSummary,
      count: interviews.length,
    },
    {
      title: "יום מיונים",
      href: `/agam/candidates/${candidateId}?stage=day_selection`,
      metric: dayAvg != null ? `ממוצע ${dayAvg}` : "אין ציונים",
      count: evaluations.length,
    },
    {
      title: "יום מכין",
      href: `/agam/candidates/${candidateId}?stage=preparation_day`,
      metric: prepSummary,
      count: prepDays.length,
    },
    {
      title: "סמ״ח",
      href: `/agam/candidates/${candidateId}?stage=smach`,
      metric: smachSummary,
      count: smach.length,
    },
  ];

  return (
    <section className={caseCardClass}>
      <CaseSectionHead icon={Route} title="מסלול המיון" tone="emerald" />
      <ol className="px-2 py-1.5">
        {blocks.map((block, index) => {
          const done = block.count > 0;
          return (
            <li key={block.title} className={rowDividerClass}>
              <Link
                href={block.href}
                className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-2"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold tabular-nums ${
                    done ? "bg-accent-primary text-white" : "bg-surface-2 text-text-muted"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-extrabold text-text-primary">
                    {block.title}
                    {done ? (
                      <span className="rounded-full bg-surface-2 px-1.5 text-[10px] font-bold tabular-nums text-text-muted">
                        {block.count}
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[11px] text-text-muted">{block.metric}</span>
                </span>
                <ChevronLeft size={14} className="shrink-0 text-text-muted opacity-0 transition group-hover:opacity-100" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function ScreenerChronoMenu({
  candidateId,
  interviews,
}: {
  candidateId: string;
  interviews: AgamInterview[];
}) {
  const candidatePartReady = interviews.some((row) => Boolean(row.candidate_part_completed_at));

  const items = [
    {
      label: "ראיון",
      href: `/agam/candidates/${candidateId}/interview`,
      locked: !candidatePartReady,
      hint: candidatePartReady ? "חלק המועמד הושלם" : "ממתין להשלמת חלק המועמד בראיון",
    },
    {
      label: "הערכת יום מיונים",
      href: `/agam/candidates/${candidateId}/evaluation`,
      locked: false,
      hint: "הוסף הערכה",
    },
    {
      label: "יום מכין",
      href: `/agam/candidates/${candidateId}?stage=preparation_day`,
      locked: false,
      hint: "הוסף הערכה",
    },
    {
      label: "סמ״ח — הערכת אמצע / סופית",
      href: `/agam/candidates/${candidateId}?stage=smach`,
      locked: false,
      hint: "הוסף הערכה",
    },
  ];

  return (
    <section className={caseCardClass}>
      <CaseSectionHead icon={UserCheck} title="תפריט ממיין" tone="sky" />
      <ul className="px-2 py-1.5">
        {items.map((item) => (
          <li key={item.label} className={rowDividerClass}>
            {item.locked ? (
              <div className="flex items-start gap-2.5 px-2 py-2.5 text-text-muted">
                <Lock size={14} className="mt-0.5 shrink-0" />
                <span>
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="block text-[11px]">{item.hint}</span>
                </span>
              </div>
            ) : (
              <Link
                href={item.href}
                className="group flex items-center justify-between gap-2 rounded-xl px-2 py-2.5 transition hover:bg-surface-2"
              >
                <span>
                  <span className="block text-sm font-bold text-text-primary">{item.label}</span>
                  <span className="block text-[11px] text-text-muted">{item.hint}</span>
                </span>
                <ChevronLeft size={14} className="shrink-0 text-text-muted" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
