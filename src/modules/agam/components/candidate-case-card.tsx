"use client";

import Link from "next/link";
import { AlertTriangle, ChevronLeft, Flag, Shield, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { candidateGaps } from "@/modules/agam/lib/gaps";
import { STATUS_LABELS } from "@/modules/agam/lib/stages";
import type { AgamCandidate, AgamCandidateStatus } from "@/modules/agam/types";

const STATUS_FLAG_TONE: Partial<Record<AgamCandidateStatus, string>> = {
  pending: "text-amber-600 dark:text-amber-300",
};

export const candidateCaseGridClass = "grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-4";

/** Case-file style candidate card (giur-case-card): whole card opens the file. */
export function CandidateCaseCard({
  candidate,
  action,
  fromCycleId,
}: {
  candidate: Pick<
    AgamCandidate,
    | "id"
    | "full_name"
    | "personal_number"
    | "status"
    | "command"
    | "cycle_name"
    | "planning_index"
    | "release_date"
    | "cycle_bahad1_date"
  >;
  action?: ReactNode;
  fromCycleId?: string | null;
}) {
  const subtitle = candidate.command || candidate.cycle_name || null;
  const gapList = candidateGaps(candidate);
  const gaps = gapList.length > 0 ? gapList.join(" · ") : null;
  return (
    <article className="group relative flex min-h-[12.5rem] flex-col gap-1.5 overflow-hidden rounded-[1.3rem] bg-surface-1 px-3.5 pb-3 pt-3.5 shadow-[0_0_0_1px_rgba(20,33,43,0.06),0_10px_28px_rgba(20,33,43,0.05)] transition duration-200 hover:-translate-y-[3px] hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent-primary)_24%,transparent),0_16px_36px_rgba(20,33,43,0.09)] dark:bg-[#181a22] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
      <Link
        href={`/agam/candidates/${candidate.id}${fromCycleId ? `?from=${fromCycleId}` : ""}`}
        className="absolute inset-0 z-0 rounded-[1.3rem] focus-visible:outline-2 focus-visible:outline-accent-primary/50"
        aria-label={`פתיחת התיק של ${candidate.full_name}`}
      />

      <div className="pointer-events-none relative flex items-start justify-between gap-2">
        <span className="flex h-[2.9rem] w-[2.9rem] items-center justify-center rounded-[0.9rem] bg-accent-primary/10 text-accent-primary">
          <UserRound size={26} strokeWidth={2.2} />
        </span>
        <span className="flex items-center gap-1">
          {gaps ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              פערים
            </span>
          ) : null}
          {action ? <span className="pointer-events-auto relative z-10">{action}</span> : null}
        </span>
      </div>

      <span className="pointer-events-none relative self-start text-xs font-semibold tracking-wide text-text-muted" dir="ltr">
        {candidate.personal_number}
      </span>

      <h3 className="pointer-events-none relative line-clamp-2 text-center text-[1.05rem] font-extrabold leading-tight text-text-primary">
        {candidate.full_name}
      </h3>

      {subtitle ? (
        <p className="pointer-events-none relative flex items-center justify-center gap-1 text-[0.74rem] font-semibold text-text-muted">
          <Shield size={13} className="shrink-0" />
          <span className="truncate">{subtitle}</span>
        </p>
      ) : null}

      {gaps ? (
        <p
          className="pointer-events-none relative flex items-center justify-center gap-1 text-[0.74rem] font-semibold text-amber-700 dark:text-amber-300"
          title={gaps}
        >
          <AlertTriangle size={13} className="shrink-0" />
          <span className="truncate">{gaps}</span>
        </p>
      ) : null}

      <div className="pointer-events-none relative mt-auto flex items-center gap-2 pt-1">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.7rem] bg-surface-2 text-text-muted transition group-hover:bg-accent-primary/12 group-hover:text-accent-primary">
          <ChevronLeft size={17} />
        </span>
        <span className="flex min-w-0 items-center gap-1 text-[0.74rem] font-semibold text-text-secondary">
          <Flag size={13} className={`shrink-0 ${STATUS_FLAG_TONE[candidate.status] ?? "text-accent-primary"}`} />
          <span className="truncate">{STATUS_LABELS[candidate.status]}</span>
        </span>
      </div>
    </article>
  );
}
