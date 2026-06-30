"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, MapPin, Trash2, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatScheduleTime } from "@/lib/dates/schedule-range";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";
import { CalendarEventWithRelations } from "@/types/models";

interface ScheduleDetailsModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle?: string;
  onDeleted?: () => void;
}

export function ScheduleDetailsModal({
  open,
  onClose,
  eventId,
  eventTitle,
  onDeleted,
}: ScheduleDetailsModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [event, setEvent] = useState<CalendarEventWithRelations | null>(null);
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setError("");
    setLoading(true);
    void fetch(`/api/schedules/${eventId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        const data = await response.json();
        setEvent(data.event ?? null);
      })
      .catch(() => setError("לא הצלחנו לטעון את הלו״ז"))
      .finally(() => setLoading(false));
  }, [open, eventId]);

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/schedules/${eventId}`, { method: "DELETE" });
      if (!response.ok) {
        setError("מחיקת הלו״ז נכשלה");
        return;
      }
      onDeleted?.();
      onClose();
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  if (!mounted) return null;

  const title = event?.title ?? eventTitle ?? "לו״ז";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.section
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-violet-300/40 bg-surface-1 shadow-2xl"
            >
              <header className="flex items-start justify-between gap-3 border-b border-border-weak bg-violet-500/10 px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">לו״ז / פגישה</p>
                  <h2 className="mt-1 text-xl font-bold text-text-primary">{title}</h2>
                </div>
                <button type="button" onClick={onClose} aria-label="סגירה" className="rounded-full p-2 hover:bg-surface-2">
                  <X size={16} />
                </button>
              </header>

              <div className="space-y-4 px-5 py-4">
                {loading ? <p className="text-sm text-text-secondary">טוען…</p> : null}
                {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                {event ? (
                  <>
                    <div className="rounded-xl bg-surface-2/60 p-3 text-sm">
                      <p className="flex items-center gap-2 font-semibold text-text-primary">
                        <CalendarClock size={15} className="text-violet-600" />
                        {formatScheduleTime(event)}
                      </p>
                      {event.location ? (
                        <p className="mt-2 flex items-center gap-2 text-text-secondary">
                          <MapPin size={15} />
                          {event.location}
                        </p>
                      ) : null}
                      <p className="mt-2 text-text-secondary">
                        תת-נושא: {toHebrewSubtopicLabel(event.subtopic_name ?? "")}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-text-secondary">
                        <Users size={15} />
                        {event.participant_name ?? "ללא משתתפים"}
                      </p>
                    </div>
                    {event.description ? (
                      <p className="whitespace-pre-wrap rounded-xl bg-surface-2/40 p-3 text-sm text-text-secondary">
                        {event.description}
                      </p>
                    ) : null}
                  </>
                ) : null}

                {confirmDelete ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <p className="text-sm font-bold text-rose-700">למחוק את הלו״ז?</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white"
                      >
                        {deleting ? "מוחק…" : "מחיקה"}
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-2 text-sm">
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-300/50 px-3 py-2 text-sm font-semibold text-rose-600"
                  >
                    <Trash2 size={14} />
                    מחיקת לו״ז
                  </button>
                )}
              </div>
            </motion.section>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
