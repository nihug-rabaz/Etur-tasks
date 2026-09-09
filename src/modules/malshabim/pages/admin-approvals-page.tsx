"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import { formatDateTime } from "@/modules/malshabim/lib/status";
import {
  emptyStateClass,
  pageShellClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/malshabim/lib/ui";
import type {
  MalshabimCandidate,
  MalshabimInstructionItem,
} from "@/modules/malshabim/types";

export function MalshabimAdminApprovalsPage({
  initialCandidates = [],
}: {
  initialCandidates?: MalshabimCandidate[];
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [loading, setLoading] = useState(initialCandidates.length === 0);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await malshabimFetch<{
        candidates?: MalshabimCandidate[];
      }>("/api/malshabim/approvals");
      setCandidates(Array.isArray(res.candidates) ? res.candidates : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "טעינת אישורים נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCandidates.length > 0) return;
    void load();
  }, [initialCandidates.length, load]);

  const act = async (id: string, action: "approve" | "reject") => {
    setActingId(id);
    try {
      await malshabimFetch(`/api/malshabim/approvals/${id}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setCandidates((list) => list.filter((c) => c.id !== id));
      toast.success(action === "approve" ? "התיק אושר" : "התיק נדחה");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "פעולה נכשלה");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className={pageShellClass} dir="rtl">
      <div className={`${panelClass} p-5`}>
        <h1 className="text-xl font-bold text-text-primary">אישורי מנהל</h1>
        <p className="mt-1 text-sm text-text-secondary">
          תיקים שנשלחו לאישור · {candidates.length} ממתינים
        </p>
      </div>

      {loading ? (
        <div className={`${panelClass} flex items-center justify-center gap-2 p-10`}>
          <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
          <span className="text-sm text-text-muted">טוען…</span>
        </div>
      ) : candidates.length === 0 ? (
        <p className={emptyStateClass}>אין תיקים הממתינים לאישור</p>
      ) : (
        <ul className="space-y-4">
          {candidates.map((candidate) => {
            const items = (candidate.instruction_items || []) as MalshabimInstructionItem[];
            const busy = actingId === candidate.id;
            return (
              <li key={candidate.id} className={`${panelClass} space-y-4 p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/malshabim/candidates/${candidate.id}`}
                      className="text-lg font-extrabold text-text-primary hover:text-accent-primary"
                    >
                      {candidate.full_name || "ללא שם"}
                    </Link>
                    <p className="mt-1 text-xs text-text-muted">
                      מס׳ {candidate.serial_number ?? "—"} ·{" "}
                      {candidate.phone || "—"} ·{" "}
                      נשלח {formatDateTime(candidate.approval_requested_at)}
                    </p>
                    {candidate.request_type || candidate.request_meta?.requester ? (
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={primaryButtonClass}
                      disabled={busy}
                      onClick={() => void act(candidate.id, "approve")}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      אישור
                    </button>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={busy}
                      onClick={() => void act(candidate.id, "reject")}
                    >
                      <XCircle className="h-4 w-4" />
                      דחייה
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold text-text-muted">הנחיות</p>
                  {items.length === 0 ? (
                    <p className="text-sm text-text-muted">אין הנחיות</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {items.map((item, index) => (
                        <li
                          key={index}
                          className="max-w-full rounded-2xl bg-surface-2/80 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-text-primary">
                            {item.text || "—"}
                          </span>
                          <span
                            className={`ms-2 rounded-lg px-1.5 py-0.5 text-[10px] font-bold ${
                              item.status === "הושלם"
                                ? "bg-emerald-600 text-white"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {item.status || "בטיפול"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {candidate.interview_summary ? (
                  <p className="whitespace-pre-wrap rounded-xl bg-surface-2/50 px-3 py-2 text-sm text-text-secondary">
                    {candidate.interview_summary}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
