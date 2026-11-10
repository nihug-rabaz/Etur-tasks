"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { moduleLabel } from "@/modules/dev-feedback/constants";
import { previewSlaDueDate } from "@/modules/dev-feedback/business-days";

type PendingIssue = {
  key: string;
  summary: string;
  moduleId: string | null;
  created: string | null;
  reporterName: string | null;
  browseUrl: string;
};

type Props = {
  enabled: boolean;
  canApprove: boolean;
  refreshToken?: number;
  /** Icon-sized control for the app header. */
  compact?: boolean;
};

export function KobiApprovalQueue({
  enabled,
  canApprove,
  refreshToken = 0,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<PendingIssue[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const sla = previewSlaDueDate();

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dev-feedback/pending");
      const data = (await res.json().catch(() => ({}))) as {
        issues?: PendingIssue[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "טעינה נכשלה");
      setIssues(data.issues || []);
    } catch (error) {
      console.error(error);
      if (open) {
        toast.error(error instanceof Error ? error.message : "טעינה נכשלה");
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, open]);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [enabled, load, refreshToken]);

  const act = async (issueKey: string, action: "approve" | "reject") => {
    if (!canApprove) {
      toast.error("רק הרב קובי יכול לאשר");
      return;
    }
    let notes: string | undefined;
    if (action === "reject") {
      notes = window.prompt("הערת דחייה (אופציונלי):") ?? undefined;
    }
    setBusyKey(issueKey);
    try {
      const res = await fetch("/api/dev-feedback/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueKey, action, notes }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        dueDateLabel?: string;
        assignee?: string;
      };
      if (!res.ok) throw new Error(data.error || "הפעולה נכשלה");
      if (action === "approve") {
        toast.success(
          `אושר · שובץ ל${data.assignee === "liad" ? "ליעד" : "זוהר"} · יעד ${data.dueDateLabel || sla.label}`,
        );
      } else {
        toast.success("המשימה נדחתה");
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "הפעולה נכשלה");
    } finally {
      setBusyKey(null);
    }
  };

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        className={
          compact
            ? "relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-900 transition hover:bg-amber-500/25 dark:text-amber-100"
            : "relative inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-100"
        }
        onClick={() => {
          setOpen(true);
          void load();
        }}
        title="משימות ממתינות לאישור פיתוח"
        aria-label="משימות ממתינות לאישור פיתוח"
      >
        <ShieldCheck className="h-4 w-4" />
        {!compact ? (
          <span className="hidden sm:inline">אישור פיתוח</span>
        ) : null}
        {issues.length > 0 ? (
          <span
            className={
              compact
                ? "absolute -top-1 -start-1 inline-flex min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] leading-4 text-white"
                : "inline-flex min-w-5 items-center justify-center rounded-full bg-amber-600 px-1.5 text-[10px] text-white"
            }
          >
            {issues.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-weak bg-surface-1 shadow-xl"
            dir="rtl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-border-weak bg-surface-1 px-4 py-3">
              <div>
                <h2 className="text-base font-bold">ממתינים לאישור פיתוח</h2>
                <p className="text-xs text-text-muted">
                  אחרי אישור — יעד SLA משוער: {sla.label}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-surface-2"
                onClick={() => setOpen(false)}
                aria-label="סגור"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              {loading && !issues.length ? (
                <div className="flex justify-center py-8 text-text-muted">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : null}
              {!loading && issues.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">
                  אין משימות ממתינות כרגע
                </p>
              ) : null}
              {issues.map((issue) => (
                <article
                  key={issue.key}
                  className="rounded-xl border border-border-weak bg-surface-0 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <a
                        href={issue.browseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold text-blue-700 hover:underline"
                      >
                        {issue.key}
                      </a>
                      <h3 className="text-sm text-text-primary">{issue.summary}</h3>
                      <p className="mt-1 text-xs text-text-muted">
                        {moduleLabel(issue.moduleId)}
                        {issue.reporterName ? ` · ${issue.reporterName}` : ""}
                      </p>
                    </div>
                  </div>
                  {canApprove ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyKey === issue.key}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        onClick={() => void act(issue.key, "approve")}
                      >
                        {busyKey === issue.key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        אשר לפיתוח
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === issue.key}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                        onClick={() => void act(issue.key, "reject")}
                      >
                        דחה
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-text-muted">
                      תצוגה בלבד — רק הרב קובי יכול לאשר
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
