"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, MessageSquare, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { moduleLabel } from "@/modules/dev-feedback/constants";
import { previewSlaDueDate } from "@/modules/dev-feedback/business-days";

type PendingIssue = {
  id: string;
  key: string;
  summary: string;
  description?: string;
  moduleId: string | null;
  created: string | null;
  reporterName: string | null;
  pageUrl?: string | null;
  kobiNotes?: string | null;
  browseUrl: string | null;
  attachments?: Array<{
    id: string;
    filename: string;
    contentType: string;
    previewUrl: string | null;
  }>;
};

type Props = {
  enabled: boolean;
  canApprove: boolean;
  refreshToken?: number;
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

  const act = async (
    id: string,
    action: "approve" | "reject" | "comment",
  ) => {
    if (!canApprove) {
      toast.error("רק הרב קובי יכול לאשר");
      return;
    }
    let notes: string | undefined;
    if (action === "reject") {
      notes = window.prompt("הערת דחייה (אופציונלי):") ?? undefined;
    } else if (action === "comment") {
      notes = window.prompt("הערה לרשומה (תישאר ממתינה):") ?? undefined;
      if (!notes?.trim()) return;
    } else if (action === "approve") {
      notes = window.prompt("הערת אישור (אופציונלי):") ?? undefined;
    }
    setBusyKey(id);
    try {
      const res = await fetch("/api/dev-feedback/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, notes }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        dueDateLabel?: string;
        assignee?: string;
        issueKey?: string;
      };
      if (!res.ok) throw new Error(data.error || "הפעולה נכשלה");
      if (action === "approve") {
        toast.success(
          `אושר${data.issueKey ? ` · ${data.issueKey}` : ""} · שובץ ל${
            data.assignee === "liad" ? "ליעד" : "זוהר"
          } · יעד ${data.dueDateLabel || sla.label}`,
        );
      } else if (action === "reject") {
        toast.success("המשימה נדחתה (לא נפתח כרטיס ב־Jira)");
      } else {
        toast.success("ההערה נשמרה");
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
                  עדיין לא ב־Jira · אחרי אישור יעד SLA משוער: {sla.label}
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
                  key={issue.id}
                  className="rounded-xl border border-border-weak bg-surface-0 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-text-primary">
                        {issue.summary}
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        {moduleLabel(issue.moduleId)}
                        {issue.reporterName ? ` · ${issue.reporterName}` : ""}
                      </p>
                      {issue.description ? (
                        <p className="mt-2 whitespace-pre-wrap text-xs text-text-secondary">
                          {issue.description}
                        </p>
                      ) : null}
                      {issue.kobiNotes ? (
                        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-950 dark:text-amber-100">
                          {issue.kobiNotes}
                        </p>
                      ) : null}
                      {issue.attachments?.length ? (
                        <ul className="mt-2 space-y-2">
                          {issue.attachments.map((a) => {
                            const isImage = (a.contentType || "")
                              .toLowerCase()
                              .startsWith("image/");
                            return (
                              <li key={a.id} className="text-[11px] text-text-muted">
                                {a.previewUrl && isImage ? (
                                  <a
                                    href={a.previewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block overflow-hidden rounded-lg border border-border-weak"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={a.previewUrl}
                                      alt={a.filename}
                                      className="max-h-48 w-full object-contain bg-surface-2"
                                    />
                                    <span className="block truncate px-2 py-1 text-blue-700 hover:underline">
                                      {a.filename}
                                    </span>
                                  </a>
                                ) : a.previewUrl ? (
                                  <a
                                    href={a.previewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-700 hover:underline"
                                  >
                                    {a.filename}
                                  </a>
                                ) : (
                                  a.filename
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                  {canApprove ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyKey === issue.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        onClick={() => void act(issue.id, "approve")}
                      >
                        {busyKey === issue.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        אשר לפיתוח
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === issue.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-border-weak px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                        onClick={() => void act(issue.id, "comment")}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        הערה
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === issue.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                        onClick={() => void act(issue.id, "reject")}
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
