"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import { formatDateTime } from "@/modules/malshabim/lib/status";
import {
  cardClass,
  emptyStateClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/malshabim/lib/ui";
import type {
  MalshabimCandidate,
  MalshabimInstructionItem,
} from "@/modules/malshabim/types";

function assigneeLabel(item: MalshabimInstructionItem): string | null {
  if (Array.isArray(item.assignees) && item.assignees.length > 0) {
    const names = item.assignees
      .map((a) => (typeof a.name === "string" ? a.name.trim() : ""))
      .filter(Boolean);
    if (names.length > 0) return names.join(", ");
  }
  if (typeof item.assignee_name === "string" && item.assignee_name.trim()) {
    return item.assignee_name.trim();
  }
  return null;
}

export function MalshabimAdminApprovalsPage({
  initialCandidates = [],
}: {
  initialCandidates?: MalshabimCandidate[];
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [loading, setLoading] = useState(initialCandidates.length === 0);
  const [canApprove, setCanApprove] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await malshabimFetch<{
        candidates?: MalshabimCandidate[];
        canApprove?: boolean;
      }>("/api/malshabim/approvals");
      setCandidates(Array.isArray(res.candidates) ? res.candidates : []);
      setCanApprove(Boolean(res.canApprove));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "טעינת אישורים נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approveFinal = async (candidateId: string) => {
    if (!canApprove) return;
    setApprovingId(candidateId);
    try {
      await malshabimFetch(`/api/malshabim/approvals/${candidateId}`, {
        method: "POST",
        body: JSON.stringify({ action: "approve" }),
      });
      toast.success("התיק אושר סופית");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "אישור סופי נכשל");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className={pageShellClass} dir="rtl">
      <div className={`${panelClass} p-5`}>
        <h1 className={pageTitleClass}>אישורי מנהל</h1>
        <p className={pageSubtitleClass}>
          תיקים שנשלחו לאישור · {candidates.length} ממתינים · פתחו את התיק כדי
          לאשר או לשלוח הערות
        </p>
        {!canApprove && !loading ? (
          <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-200">
            צפייה בלבד — רק ישראל או הרב קובי יכולים לאשר או לשלוח הערות מתוך
            התיק.
          </p>
        ) : canApprove && !loading ? (
          <p className="mt-2 text-xs font-semibold text-text-muted">
            ניתן לאשר סופית מהרשימה, או להיכנס לתיק לשליחת הערות.
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className={`${cardClass} flex items-center justify-center gap-2 p-10`}>
          <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
          <span className="text-sm text-text-muted">טוען…</span>
        </div>
      ) : candidates.length === 0 ? (
        <p className={emptyStateClass}>אין תיקים הממתינים לאישור</p>
      ) : (
        <ul className="space-y-4">
          {candidates.map((candidate) => {
            const items = Array.isArray(candidate.instruction_items)
              ? (candidate.instruction_items as MalshabimInstructionItem[])
              : [];
            const busy = approvingId === candidate.id;
            return (
              <li
                key={candidate.id}
                className={`${cardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between`}
              >
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <Link
                      href={`/malshabim/candidates/${candidate.id}`}
                      className="text-lg font-bold text-text-primary hover:text-accent-primary"
                    >
                      {candidate.full_name || "ללא שם"}
                    </Link>
                    <p className="mt-1 text-xs text-text-muted">
                      מס׳ {candidate.serial_number ?? "—"} ·{" "}
                      {candidate.phone || "—"} · נשלח{" "}
                      {formatDateTime(candidate.approval_requested_at)}
                    </p>
                    {candidate.request_type ||
                    candidate.request_meta?.requester ? (
                      <p className="mt-1 text-xs text-text-secondary">
                        {[
                          candidate.request_type,
                          candidate.request_meta?.requester,
                          candidate.request_meta?.unit,
                          candidate.request_meta?.role,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-text-muted">הנחיות</p>
                    {items.length === 0 ? (
                      <p className="text-sm text-text-muted">אין הנחיות</p>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {items.map((item, index) => {
                          const assignee = assigneeLabel(item);
                          return (
                            <li
                              key={index}
                              className="max-w-full rounded-2xl bg-surface-2/80 px-3 py-2 text-sm"
                            >
                              <span className="font-medium text-text-primary">
                                {item.text || "—"}
                              </span>
                              {assignee ? (
                                <span className="ms-2 rounded-full bg-accent-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-accent-primary">
                                  {assignee}
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {candidate.interview_summary ? (
                    <p className="whitespace-pre-wrap rounded-xl bg-surface-2/50 px-3 py-2 text-sm text-text-secondary">
                      {candidate.interview_summary}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:min-w-[9.5rem]">
                  <Link
                    href={`/malshabim/candidates/${candidate.id}`}
                    className={`${secondaryButtonClass} border border-text-primary/80`}
                  >
                    פתח תיק
                  </Link>
                  {canApprove ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void approveFinal(candidate.id)}
                      className={`${primaryButtonClass} bg-emerald-600 hover:bg-emerald-700`}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      אישור סופי
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
