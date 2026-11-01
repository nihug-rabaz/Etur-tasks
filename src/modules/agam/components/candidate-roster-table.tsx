"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { candidateGaps } from "@/modules/agam/lib/gaps";
import { STATUS_LABELS } from "@/modules/agam/lib/stages";
import type { AgamCandidate, AgamCandidateStatus } from "@/modules/agam/types";

const PODIUM_TONES = [
  "bg-amber-400/20 text-amber-800 ring-amber-500/30 dark:text-amber-200",
  "bg-slate-300/30 text-slate-700 ring-slate-400/30 dark:text-slate-200",
  "bg-orange-300/25 text-orange-800 ring-orange-400/30 dark:text-orange-200",
];

const STATUS_DOT: Record<AgamCandidateStatus, string> = {
  pending: "bg-amber-500",
  passed: "bg-emerald-500",
  not_passed: "bg-rose-500",
};

/** Ranked first (1..n), then unranked by name. */
export function sortByCycleRank<T extends Pick<AgamCandidate, "cycle_rank" | "full_name">>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.cycle_rank != null && b.cycle_rank != null) return a.cycle_rank - b.cycle_rank;
    if (a.cycle_rank != null) return -1;
    if (b.cycle_rank != null) return 1;
    return a.full_name.localeCompare(b.full_name, "he");
  });
}

export function CandidateRosterTable({
  candidates,
  fromCycleId,
}: {
  candidates: AgamCandidate[];
  fromCycleId?: string | null;
}) {
  const router = useRouter();
  const hrefFor = (id: string) => `/agam/candidates/${id}${fromCycleId ? `?from=${fromCycleId}` : ""}`;
  const thClass = "px-3 py-2.5 text-start text-[11px] font-extrabold text-text-muted first:ps-4 last:pe-4";

  return (
    <div className="overflow-x-auto rounded-2xl bg-surface-1 shadow-[0_0_0_1px_rgba(20,33,43,0.07),0_8px_24px_rgba(20,33,43,0.04)] dark:bg-[#181a22] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead className="bg-surface-2/60">
          <tr>
            <th className={`${thClass} w-16`}>דירוג</th>
            <th className={thClass}>מועמד</th>
            <th className={thClass}>יחידה</th>
            <th className={`${thClass} w-24`}>מדד · דפ״ר</th>
            <th className={thClass}>פערים</th>
            <th className={`${thClass} w-24`}>סטטוס</th>
            <th className={`${thClass} w-10`} aria-label="פתיחה" />
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => {
            const rank = candidate.cycle_rank;
            const podium = rank != null ? PODIUM_TONES[rank - 1] : undefined;
            const gaps = candidateGaps(candidate);
            const href = hrefFor(candidate.id);
            return (
              <tr
                key={candidate.id}
                onClick={() => router.push(href)}
                className="group cursor-pointer transition-colors hover:bg-accent-primary/[0.04] [&:not(:first-child)]:shadow-[inset_0_1px_0_rgba(20,33,43,0.06)] dark:[&:not(:first-child)]:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
              >
                <td className="py-3 pe-3 ps-4">
                  {rank != null ? (
                    <span
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-xl px-1.5 text-sm font-extrabold tabular-nums ring-1 ${
                        podium ?? "bg-accent-primary/10 text-accent-primary ring-transparent"
                      }`}
                    >
                      {rank}
                    </span>
                  ) : (
                    <span className="inline-flex h-8 min-w-8 items-center justify-center text-sm font-bold text-text-muted/60">
                      –
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={href}
                    onClick={(event) => event.stopPropagation()}
                    className="block truncate font-extrabold text-text-primary transition group-hover:text-accent-primary"
                  >
                    {candidate.full_name}
                  </Link>
                  <span className="text-[11px] font-semibold tabular-nums text-text-muted" dir="ltr">
                    {candidate.personal_number}
                  </span>
                </td>
                <td className="max-w-[10rem] truncate px-3 py-3 text-xs font-semibold text-text-secondary">
                  {candidate.command || "—"}
                </td>
                <td className="px-3 py-3 text-xs font-bold tabular-nums text-text-secondary">
                  {candidate.planning_index ?? "—"}
                  <span className="mx-1 text-text-muted/50">·</span>
                  {candidate.dapar ?? "—"}
                </td>
                <td className="px-3 py-3">
                  {gaps.length > 0 ? (
                    <span
                      className="inline-flex max-w-[12rem] items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-200"
                      title={gaps.join(" · ")}
                    >
                      <AlertTriangle size={11} className="shrink-0" />
                      <span className="truncate">{gaps.length === 1 ? gaps[0] : `${gaps.length} פערים`}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted/60">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[candidate.status] ?? "bg-surface-2"}`} />
                    {STATUS_LABELS[candidate.status]}
                  </span>
                </td>
                <td className="py-3 pe-4 ps-1 text-text-muted transition group-hover:text-accent-primary">
                  <ChevronLeft size={16} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
