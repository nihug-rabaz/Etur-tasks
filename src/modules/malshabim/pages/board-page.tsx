"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CANDIDATE_STATUSES,
  STATUS_COLORS,
} from "@/modules/malshabim/lib/status";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import { pageShellClass, panelClass, secondaryButtonClass } from "@/modules/malshabim/lib/ui";
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
      const status = (CANDIDATE_STATUSES.includes(
        candidate.candidate_status as MalshabimCandidateStatus,
      )
        ? candidate.candidate_status
        : "חדש") as MalshabimCandidateStatus;
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
            changes: `סטטוס עבודה עודכן ל: ${status}`,
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
      <div className={`${panelClass} p-5`}>
        <h1 className="text-xl font-bold text-text-primary">לוח עבודה</h1>
        <p className="mt-1 text-sm text-text-secondary">
          עמודות לפי סטטוס מועמד{canEdit ? " — לחצו על סטטוס לשינוי" : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {CANDIDATE_STATUSES.map((status) => (
          <section key={status} className={`${panelClass} flex min-h-[280px] flex-col p-4`}>
            <header className="mb-3 flex items-center justify-between gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLORS[status]}`}
              >
                {status}
              </span>
              <span className="text-xs font-semibold text-text-muted">
                {columns[status].length}
              </span>
            </header>
            <ul className="flex flex-1 flex-col gap-2">
              {columns[status].map((candidate) => (
                <li
                  key={candidate.id}
                  className="rounded-2xl bg-surface-1 p-3 shadow-[var(--shadow-soft)]"
                >
                  <Link
                    href={`/malshabim/candidates/${candidate.id}`}
                    className="block text-sm font-bold text-text-primary hover:text-accent-primary"
                  >
                    {candidate.full_name || "ללא שם"}
                  </Link>
                  <p className="mt-1 text-xs text-text-muted">
                    #{candidate.serial_number ?? "—"} · {candidate.city || "—"}
                  </p>
                  {canEdit ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {CANDIDATE_STATUSES.filter((s) => s !== status).map((next) => (
                        <button
                          key={next}
                          type="button"
                          className={`${secondaryButtonClass} !px-2 !py-1 text-[11px]`}
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
