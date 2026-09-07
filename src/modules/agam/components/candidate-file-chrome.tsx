"use client";

import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";
import { panelClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type {
  AgamDayEvaluation,
  AgamInterview,
  AgamPrepDayEvaluation,
  AgamSmachEvaluation,
} from "@/modules/agam/types";

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
    <div className="flex flex-col gap-3">
      {blocks.map((block) => (
        <Link
          key={block.title}
          href={block.href}
          className={`${panelClass} group p-4 transition hover:ring-1 hover:ring-black/10 dark:hover:ring-white/15`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-extrabold text-text-primary sm:text-lg">{block.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{block.metric}</p>
            </div>
            <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-text-muted">
              {block.count}
            </span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-text-muted group-hover:text-text-primary">
            פתיחה
            <ChevronLeft size={12} className="rotate-180" />
          </span>
        </Link>
      ))}
    </div>
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
    <section className={`${panelClass} p-5`}>
      <h2 className="text-base font-extrabold text-text-primary">תפריט ממיין</h2>
      <p className="mt-1 text-xs text-text-muted">לפי סדר כרונולוגי</p>
      <ul className="mt-4 space-y-2">
        {items.map((item) =>
          item.locked ? (
            <li
              key={item.label}
              className="flex items-start gap-2 rounded-xl bg-surface-2/70 px-3 py-2.5 text-sm text-text-muted"
            >
              <Lock size={14} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">{item.label}</p>
                <p className="text-[11px]">{item.hint}</p>
              </div>
            </li>
          ) : (
            <li key={item.label}>
              <Link href={item.href} className={`${secondaryButtonClass} w-full justify-between`}>
                <span className="text-start">
                  <span className="block font-bold">{item.label}</span>
                  <span className="block text-[11px] font-medium text-text-muted">{item.hint}</span>
                </span>
                <ChevronLeft size={14} className="rotate-180 opacity-60" />
              </Link>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
