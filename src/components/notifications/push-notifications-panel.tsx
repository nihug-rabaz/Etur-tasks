"use client";

import { Bell, Check, Loader2, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { OneSignalWebClient } from "@/lib/onesignal/onesignal-web-client";

interface PushStatus {
  configured: boolean;
  sendReady: boolean;
  pushReady: boolean;
  userId: string;
}

type Banner = { tone: "success" | "error" | "info"; text: string } | null;

export function PushNotificationsPanel({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshStatus = useCallback(async (): Promise<PushStatus | null> => {
    try {
      const response = await fetch("/api/notifications/status");
      if (!response.ok) return null;
      const data = (await response.json()) as PushStatus;
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 30000);
    const handleFocus = () => {
      void refreshStatus();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshStatus]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    refreshStatus().finally(() => setLoading(false));
  }, [open, refreshStatus]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => setBanner(null), 3500);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const enablePush = async () => {
    setBusyAction("optin");
    try {
      const enabled = await OneSignalWebClient.requestOptIn(status?.userId);
      if (enabled) {
        setBanner({ tone: "success", text: "התראות הדפדפן הופעלו בהצלחה" });
        toast.success("התראות הדפדפן הופעלו");
      } else {
        setBanner({
          tone: "error",
          text: "לא ניתן להפעיל התראות. ודאו שהדפדפן מאפשר התראות ושאתם באתר הייצור.",
        });
      }
      await refreshStatus();
    } finally {
      setBusyAction(null);
    }
  };

  const clientConfigured = OneSignalWebClient.isConfigured();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="התראות"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition hover:bg-accent-primary/12 hover:text-accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
      >
        <Bell size={16} />
        {status?.pushReady ? (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_2px_var(--surface-1)]" />
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-2rem)] origin-top-left overflow-hidden rounded-2xl border border-border-weak bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/5"
          >
            <div className="flex items-center justify-between gap-3 bg-gradient-to-l from-accent-purple/12 to-accent-cyan/12 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent-primary" />
                <div>
                  <p className="text-sm font-bold text-text-primary">התראות דפדפן</p>
                  <p className="text-[0.6875rem] text-text-muted">OneSignal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגור"
                className="rounded-lg p-1 text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              {banner ? (
                <div
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    banner.tone === "success"
                      ? "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : banner.tone === "error"
                        ? "border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300"
                        : "border-sky-300/60 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300"
                  }`}
                >
                  {banner.text}
                </div>
              ) : null}

              {loading && !status ? (
                <div className="flex items-center justify-center py-6 text-text-muted">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : !status?.configured ? (
                <div className="rounded-xl border border-border-weak bg-surface-2/60 p-3">
                  <p className="text-sm font-semibold text-text-primary">OneSignal לא מוגדר</p>
                  <p className="mt-1 text-xs text-text-muted">
                    הוסיפו NEXT_PUBLIC_ONESIGNAL_APP_ID ו-ONESIGNAL_REST_API_KEY לשרת.
                  </p>
                </div>
              ) : status.pushReady ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/70 p-3 dark:border-emerald-400/30 dark:bg-emerald-500/10">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                        <Check size={14} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">
                          התראות פעילות
                        </p>
                        <p className="text-[0.6875rem] text-emerald-700/80 dark:text-emerald-300/70">
                          תקבלו עדכונים על משימות, לו״ז ותזכורות
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border-weak bg-surface-2/60 p-3">
                    <p className="text-sm font-semibold text-text-primary">התראות לא מופעלות</p>
                    <p className="mt-1 text-xs text-text-muted">
                      הפעילו התראות דפדפן כדי לקבל עדכונים על משימות חדשות, תזכורות ולו״ז.
                    </p>
                  </div>
                  {!clientConfigured ? (
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      הדפדפן לא רואה את הגדרות OneSignal. הפעילו מחדש את השרת או דיפלוי חדש.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void enablePush()}
                    disabled={busyAction === "optin" || !clientConfigured}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-accent-purple to-accent-cyan px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-purple/20 transition hover:brightness-105 disabled:opacity-60"
                  >
                    {busyAction === "optin" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Bell size={16} />
                    )}
                    הפעל התראות
                  </button>
                </div>
              )}

              {isAdmin ? <AdminMorningTimeSetting /> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AdminMorningTimeSetting() {
  const [time, setTime] = useState("07:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/telegram/morning-time");
        if (!response.ok) return;
        const data = (await response.json()) as { time?: string };
        if (!cancelled && data.time) setTime(data.time);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/telegram/morning-time", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { time?: string };
      if (data.time) setTime(data.time);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  return (
    <div className="border-t border-border-weak pt-3">
      <div className="rounded-lg border border-amber-300/50 bg-amber-50/70 px-2.5 py-2 dark:border-amber-400/25 dark:bg-amber-500/10">
        <p className="text-[0.9375rem] font-bold leading-tight text-text-primary">זמן הודעת הבוקר טוב</p>
        <p className="mt-0.5 text-xs leading-snug text-text-muted">
          מתי נשלחת הודעת &quot;בוקר טוב&quot; עם המשימות להיום
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="time"
            dir="ltr"
            value={time}
            disabled={loading || saving}
            onChange={(event) => setTime(event.target.value)}
            className="w-[6.75rem] shrink-0 rounded-lg border border-border-weak bg-white px-2 py-1.5 text-left text-base font-bold text-text-primary disabled:opacity-60 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={loading || saving}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-accent-primary px-3 py-1.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            שמור
          </button>
          {saved ? (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">נשמר</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
