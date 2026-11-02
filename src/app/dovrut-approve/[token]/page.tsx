"use client";

import { use, useCallback, useEffect, useState, type FormEvent } from "react";
import {
  fieldClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/dovrut/lib/ui";

type BriefConcept = {
  id: string;
  name: string;
  details: string | null;
  interviewees: string[];
  media_outlet: string | null;
  approval_status: string | null;
  step: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; concept: BriefConcept; expiresAt: string }
  | { status: "done"; action: "approve" | "reject"; name: string };

export default function DovrutPublicApprovePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/dovrut/public/approval/${encodeURIComponent(token)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({
          status: "error",
          message: typeof data.error === "string" ? data.error : "שגיאה בטעינה",
        });
        return;
      }
      setState({
        status: "ready",
        concept: data.concept as BriefConcept,
        expiresAt: data.token?.expires_at ?? "",
      });
    } catch {
      setState({ status: "error", message: "שגיאת רשת" });
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (state.status !== "ready") return;
    setFormError(null);
    if (!notes.trim()) {
      setFormError("יש להזין הערה");
      return;
    }
    if (action === "reject" && !rejectionReason.trim()) {
      setFormError("יש להזין סיבת דחייה");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dovrut/public/approval/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: notes.trim(),
          rejectionReason: action === "reject" ? rejectionReason.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "הפעולה נכשלה");
        return;
      }
      setState({
        status: "done",
        action,
        name: state.concept.name,
      });
    } catch {
      setFormError("שגיאת רשת");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-white to-slate-100 px-4 py-10 text-right dark:from-slate-900 dark:via-slate-950 dark:to-black"
      dir="rtl"
    >
      <div className={`mx-auto w-full max-w-lg ${panelClass} p-6 sm:p-8`}>
        <p className="text-xs font-bold tracking-wide text-accent-primary">דוברות · אישור חיצוני</p>
        <h1 className="mt-2 text-2xl font-black text-text-primary">אישור כתבה / ראיון</h1>

        {state.status === "loading" ? (
          <p className="mt-6 text-sm font-medium text-text-secondary">טוען פרטים…</p>
        ) : null}

        {state.status === "error" ? (
          <p className="mt-6 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">
            {state.message}
          </p>
        ) : null}

        {state.status === "done" ? (
          <div className="mt-6 space-y-2">
            <p className="text-lg font-bold text-text-primary">
              {state.action === "approve" ? "האישור נרשם בהצלחה" : "הדחייה נרשמה"}
            </p>
            <p className="text-sm text-text-secondary">{state.name}</p>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <form className="mt-6 space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2 rounded-2xl bg-surface-2/70 p-4">
              <h2 className="text-lg font-black text-text-primary">{state.concept.name}</h2>
              {state.concept.media_outlet ? (
                <p className="text-sm text-text-secondary">
                  מדיה: <span className="font-bold text-text-primary">{state.concept.media_outlet}</span>
                </p>
              ) : null}
              {state.concept.interviewees?.length ? (
                <p className="text-sm text-text-secondary">
                  מרואיינים:{" "}
                  <span className="font-bold text-text-primary">
                    {state.concept.interviewees.join(", ")}
                  </span>
                </p>
              ) : null}
              {state.concept.details ? (
                <p className="whitespace-pre-wrap text-sm text-text-primary/90">{state.concept.details}</p>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className={action === "approve" ? primaryButtonClass : secondaryButtonClass}
                onClick={() => setAction("approve")}
              >
                אישור
              </button>
              <button
                type="button"
                className={action === "reject" ? primaryButtonClass : secondaryButtonClass}
                onClick={() => setAction("reject")}
              >
                דחייה
              </button>
            </div>

            {action === "reject" ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-text-secondary">סיבת דחייה</span>
                <input
                  className={fieldClass}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="למה נדחה?"
                  required
                />
              </label>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-text-secondary">הערה (חובה)</span>
              <textarea
                className={`${fieldClass} min-h-[6rem] resize-y`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות לאישור / לדחייה"
                required
              />
            </label>

            {formError ? (
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{formError}</p>
            ) : null}

            <button type="submit" className={`${primaryButtonClass} w-full`} disabled={submitting}>
              {submitting ? "שולח…" : action === "approve" ? "אשר" : "דחה"}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
