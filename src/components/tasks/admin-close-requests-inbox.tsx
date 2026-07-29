"use client";

import { Check, Clock3, Inbox, Loader2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCloseRequests } from "@/components/tasks/close-requests-context";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

export function AdminCloseRequestsInbox() {
  const router = useRouter();
  const { ready, canClose, requests, approveRequest, rejectRequest } = useCloseRequests();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = 340;
    let left = rect.right - width;
    if (left < 8) left = 8;
    setPos({ top: rect.bottom + 8, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const panel = document.getElementById(panelId);
      if (buttonRef.current?.contains(event.target as Node)) return;
      if (panel?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, panelId]);

  if (!ready || !canClose) return null;

  const count = requests.length;

  const panel =
    open && mounted
      ? createPortal(
          <div
            id={panelId}
            role="dialog"
            aria-label="בקשות סגירת משימות"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 340, zIndex: 20000 }}
            className="overflow-hidden rounded-2xl border border-border-weak bg-surface-1 shadow-[0_20px_50px_-18px_rgba(15,23,42,0.45)]"
          >
            <div className="border-b border-border-weak bg-gradient-to-l from-amber-500/15 via-surface-1 to-surface-1 px-4 py-3">
              <div className="flex items-center gap-2">
                <Inbox size={16} className="text-amber-600" />
                <p className="text-sm font-bold text-text-primary">בקשות סגירה</p>
                <span className="ms-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-200">
                  {count}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-text-secondary">משתמשים ממתינים לאישור מנהל</p>
            </div>
            <div className="max-h-[min(420px,60vh)] overflow-y-auto">
              {count === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-muted">אין בקשות ממתינות</p>
              ) : (
                <ul className="divide-y divide-border-weak">
                  {requests.map((item) => (
                    <li key={item.id} className="px-4 py-3">
                      <p className="text-sm font-semibold text-text-primary">{item.task_title}</p>
                      <p className="mt-0.5 text-[11px] text-text-secondary">
                        {item.requester_name}
                        {item.subtopic_name
                          ? ` · ${toHebrewSubtopicLabel(item.subtopic_name)}`
                          : ""}
                      </p>
                      {item.note ? (
                        <p className="mt-1.5 rounded-lg bg-surface-2/80 px-2.5 py-1.5 text-[11px] leading-relaxed text-text-secondary">
                          {item.note}
                        </p>
                      ) : null}
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              const ok = await approveRequest(item.id);
                              if (ok) router.refresh();
                            });
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                        >
                          <Check size={12} strokeWidth={2.8} />
                          אשר סגירה
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              const ok = await rejectRequest(item.id);
                              if (ok) router.refresh();
                            });
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-border-weak bg-surface-2 px-2.5 py-1.5 text-[11px] font-bold text-text-secondary transition hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-60"
                        >
                          <X size={12} />
                          דחה
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={count > 0 ? `${count} בקשות סגירה ממתינות` : "בקשות סגירה"}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-weak bg-surface-1 text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Inbox size={15} />}
        {count > 0 ? (
          <span className="absolute -end-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      {panel}
    </>
  );
}

export function CloseRequestPendingBadge({
  taskId,
  compact = false,
}: {
  taskId: string;
  compact?: boolean;
}) {
  const { getPendingForTask, canClose, cancelRequest, approveRequest, rejectRequest } =
    useCloseRequests();
  const pending = getPendingForTask(taskId);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!pending) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100 ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <Clock3 size={compact ? 11 : 12} className="shrink-0" />
      <span className="font-bold">
        {canClose ? `בקשת סגירה · ${pending.requester_name}` : "ממתין לאישור מנהל"}
      </span>
      {canClose ? (
        <>
          <button
            type="button"
            disabled={isPending}
            title="אשר סגירה"
            onClick={() => {
              startTransition(async () => {
                const ok = await approveRequest(pending.id);
                if (ok) router.refresh();
              });
            }}
            className="rounded-full bg-emerald-500 p-0.5 text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            <Check size={11} strokeWidth={3} />
          </button>
          <button
            type="button"
            disabled={isPending}
            title="דחה"
            onClick={() => {
              startTransition(async () => {
                const ok = await rejectRequest(pending.id);
                if (ok) router.refresh();
              });
            }}
            className="rounded-full bg-surface-1 p-0.5 text-text-secondary transition hover:bg-rose-500/15 hover:text-rose-700 disabled:opacity-60"
          >
            <X size={11} />
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={isPending}
          title="בטל בקשה"
          onClick={() => {
            startTransition(async () => {
              await cancelRequest(pending.id);
            });
          }}
          className="rounded-full bg-surface-1 p-0.5 text-text-secondary transition hover:bg-rose-500/15 hover:text-rose-700 disabled:opacity-60"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}
