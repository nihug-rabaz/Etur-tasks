"use client";

import { Loader2, Sparkles, Unlock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ASSISTANT_DISPLAY_NAME } from "@/modules/assistant/lib/protocol";

type ReleaseState = {
  released: boolean;
  previewEmail: string;
  canRelease: boolean;
  actorEmail: string | null;
};

export function AssistantReleasePanel() {
  const [state, setState] = useState<ReleaseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/assistant/release");
      if (!res.ok) {
        setState(null);
        return;
      }
      const data = (await res.json()) as ReleaseState;
      setState(data);
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const release = async () => {
    if (!state?.canRelease || busy) return;
    const ok = window.confirm(
      `לשחרר את "${ASSISTANT_DISPLAY_NAME}" לכלל מנהלי הפלטפורמה והרמד?\nפעולה חד־פעמית.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/assistant/release", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error || "השחרור נכשל");
        return;
      }
      toast.success(data.message || "שוחרר");
      await load();
    } catch {
      toast.error("השחרור נכשל");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-glass rounded-3xl p-5 sm:p-6" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-accent-primary/15 p-2.5 text-accent-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-text-primary">{ASSISTANT_DISPLAY_NAME}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            שחרור חד־פעמי לשימוש כלל מנהלי הפלטפורמה והרמד. עד אז רק{" "}
            <span className="font-semibold text-text-primary">
              {state?.previewEmail ?? "admin@rabaz-idf.com"}
            </span>{" "}
            רואה את העוזר.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-surface-2/70 px-4 py-3 text-sm text-text-secondary">
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            טוען…
          </span>
        ) : state?.released ? (
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
            העוזר פתוח לכלל המנהלים והרמד.
          </span>
        ) : (
          <span>
            סגור כרגע · תצוגה מקדימה בלבד למשתמש המורשה
            {state?.actorEmail ? ` (${state.actorEmail})` : ""}.
          </span>
        )}
      </div>

      {!loading && state && !state.released ? (
        <button
          type="button"
          disabled={busy || !state.canRelease}
          onClick={() => void release()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
          שחרור חד־פעמי לכלל המנהלים והרמד
        </button>
      ) : null}
    </div>
  );
}
