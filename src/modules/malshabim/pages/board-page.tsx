"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CANDIDATE_STATUSES,
  STATUS_COLORS,
  normalizeCandidateStatus,
} from "@/modules/malshabim/lib/status";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import {
  cardClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
  panelClass,
} from "@/modules/malshabim/lib/ui";
import type {
  MalshabimCandidate,
  MalshabimCandidateStatus,
} from "@/modules/malshabim/types";
import type { ModuleRole } from "@/shared/modules/types";

export function MalshabimBoardPage({
  initialCandidates,
  initialRole,
}: {
  initialCandidates: MalshabimCandidate[];
  initialRole: ModuleRole;
}) {
  const canEdit = initialRole === "admin" || initialRole === "user";
  const [candidates, setCandidates] = useState(
    initialCandidates.filter((c) => !c.is_draft),
  );

  const columns = useMemo(() => {
    const map = Object.fromEntries(
      CANDIDATE_STATUSES.map((status) => [status, [] as MalshabimCandidate[]]),
    ) as Record<MalshabimCandidateStatus, MalshabimCandidate[]>;
    for (const candidate of candidates) {
      const status = normalizeCandidateStatus(candidate.candidate_status);
      map[status].push(candidate);
    }
    return map;
  }, [candidates]);

  const moveTo = async (id: string, status: MalshabimCandidateStatus) => {
    if (!canEdit) return;
    const prev = candidates;
    setCandidates((list) =>
      list.map((c) => (c.id === id ? { ...c, candidate_status: status } : c)),
    );
    try {
      await malshabimFetch(`/api/malshabim/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          candidate_status: status,
          update_log_entry: {
            changes: `סטטוס עודכן ל: ${status}`,
          },
        }),
      });
    } catch {
      setCandidates(prev);
      toast.error("עדכון סטטוס נכשל");
    }
  };

  return (
    <div className={pageShellClass} dir="rtl">
      <div className={`${panelClass} p-4 sm:p-5`}>
        <h1 className={pageTitleClass}>לוח עבודה</h1>
        <p className={pageSubtitleClass}>
          עמודות לפי סטטוס{canEdit ? " — לחצו על סטטוס לשינוי" : ""}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {CANDIDATE_STATUSES.map((status) => (
          <section
            key={status}
            className={`${cardClass} flex min-h-[280px] flex-col overflow-hidden`}
          >
            <header
              className={`flex items-center justify-between gap-2 px-3 py-3 sm:px-4 ${STATUS_COLORS[status]}`}
            >
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                {status}
              </span>
              <span className="text-xs font-bold text-white/90">
                {columns[status].length}
              </span>
            </header>
            <ul className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
              {columns[status].map((candidate) => (
                <li
                  key={candidate.id}
                  className="rounded-2xl bg-surface-1 p-3 shadow-sm"
                >
                  <Link
                    href={`/malshabim/candidates/${candidate.id}`}
                    className="block text-sm font-bold text-text-primary hover:text-accent-primary"
                  >
                    {candidate.full_name || "ללא שם"}
                  </Link>
                  <p className="mt-1 text-xs font-medium text-text-muted">
                    #{candidate.serial_number ?? "—"} · {candidate.city || "—"}
                  </p>
                  {canEdit ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {CANDIDATE_STATUSES.filter((s) => s !== status).map((next) => (
                        <button
                          key={next}
                          type="button"
                          className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-text-secondary transition hover:bg-surface-2/80 hover:text-text-primary"
                          onClick={() => void moveTo(candidate.id, next)}
                        >
                          {next}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
