"use client";

import {
  Bell,
  Check,
  Copy,
  Globe,
  Link2,
  Loader2,
  RefreshCw,
  Send,
  Smartphone,
  Sparkles,
  Unlink,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface LinkStatus {
  linked: boolean;
  chatId: string | null;
  username: string | null;
  linkedAt: string | null;
  botUsername: string | null;
}

interface LinkCode {
  code: string;
  expiresAt: string;
  botUsername: string;
  deepLink: string;
}

interface PanelProps {
  isAdmin: boolean;
}

type Banner = { tone: "success" | "error" | "info"; text: string } | null;

function buildWebLink(botUsername: string, code: string): string {
  const tgAddr = `tg://resolve?domain=${botUsername}&start=${code}`;
  return `https://web.telegram.org/k/#?tgaddr=${encodeURIComponent(tgAddr)}`;
}

export function TelegramNotificationsPanel({ isAdmin }: PanelProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [broadcastText, setBroadcastText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const pollTimer = useRef<number | null>(null);

  const refreshStatus = useCallback(async (): Promise<LinkStatus | null> => {
    try {
      const response = await fetch("/api/telegram/status");
      if (!response.ok) return null;
      const data = (await response.json()) as LinkStatus;
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, []);

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
    if (!linkCode) {
      if (pollTimer.current !== null) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }
    pollTimer.current = window.setInterval(async () => {
      try {
        await fetch("/api/telegram/poll", { method: "POST" });
      } catch {}
      const latest = await refreshStatus();
      if (latest?.linked) {
        setLinkCode(null);
        setBanner({ tone: "success", text: "החיבור הושלם בהצלחה" });
      }
    }, 2500);
    return () => {
      if (pollTimer.current !== null) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [linkCode, refreshStatus]);

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => setBanner(null), 3500);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const generateCode = async () => {
    setBusyAction("link");
    try {
      const response = await fetch("/api/telegram/link", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setBanner({ tone: "error", text: data?.error || "שגיאה ביצירת קוד" });
        return;
      }
      setLinkCode(data as LinkCode);
    } finally {
      setBusyAction(null);
    }
  };

  const unlink = async () => {
    setBusyAction("unlink");
    try {
      await fetch("/api/telegram/link", { method: "DELETE" });
      setLinkCode(null);
      await refreshStatus();
      setBanner({ tone: "info", text: "החיבור נותק" });
    } finally {
      setBusyAction(null);
    }
  };

  const sendTest = async () => {
    setBusyAction("test");
    try {
      const response = await fetch("/api/telegram/test", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setBanner({ tone: "error", text: data?.error || "שליחה נכשלה" });
        return;
      }
      setBanner({ tone: "success", text: "הודעת הבדיקה נשלחה" });
    } finally {
      setBusyAction(null);
    }
  };

  const broadcast = async () => {
    const text = broadcastText.trim();
    if (!text) return;
    setBusyAction("broadcast");
    try {
      const response = await fetch("/api/telegram/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBanner({ tone: "error", text: data?.error || "שידור נכשל" });
        return;
      }
      setBanner({ tone: "success", text: `נשלח אל ${data.sent} משתמשים` });
      setBroadcastText("");
    } finally {
      setBusyAction(null);
    }
  };

  const copyCode = async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(linkCode.code);
      setBanner({ tone: "info", text: "הקוד הועתק" });
    } catch {}
  };

  const linkedAtLabel = status?.linkedAt
    ? new Date(status.linkedAt).toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="התראות"
        className="relative rounded-xl border border-border-weak bg-surface-2/70 p-2 transition hover:border-accent-primary/50"
      >
        <Bell size={18} className="text-text-secondary" />
        {status?.linked && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_2px_var(--background)]" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-2rem)] origin-top-left overflow-hidden rounded-2xl border border-border-weak bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border-weak/60 bg-gradient-to-l from-indigo-500/10 to-cyan-500/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent-primary" />
                <div>
                  <p className="text-sm font-bold text-text-primary">התראות טלגרם</p>
                  <p className="text-[11px] text-text-muted">מרכז שליטה</p>
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
              {banner && (
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
              )}

              {loading && !status ? (
                <div className="flex items-center justify-center py-6 text-text-muted">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : status?.linked ? (
                <LinkedView
                  status={status}
                  linkedAtLabel={linkedAtLabel}
                  busyAction={busyAction}
                  onTest={sendTest}
                  onUnlink={unlink}
                />
              ) : linkCode ? (
                <PendingLinkView
                  linkCode={linkCode}
                  onCopy={copyCode}
                  onCancel={() => setLinkCode(null)}
                  onRefresh={async () => {
                    await fetch("/api/telegram/poll", { method: "POST" });
                    await refreshStatus();
                  }}
                />
              ) : (
                <UnlinkedView
                  botUsername={status?.botUsername}
                  onLink={generateCode}
                  busy={busyAction === "link"}
                />
              )}

              {isAdmin && status?.linked && (
                <BroadcastSection
                  text={broadcastText}
                  setText={setBroadcastText}
                  onSend={broadcast}
                  busy={busyAction === "broadcast"}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UnlinkedView({
  botUsername,
  onLink,
  busy,
}: {
  botUsername?: string | null;
  onLink: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border-weak bg-surface-2/60 p-3">
        <p className="text-sm font-semibold text-text-primary">החשבון אינו מחובר</p>
        <p className="mt-1 text-xs text-text-muted">
          חבר את חשבון הטלגרם שלך כדי לקבל התראות אישיות על משימות חדשות, שינויי סטטוס וזמני יעד.
        </p>
      </div>
      <button
        type="button"
        onClick={onLink}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-indigo-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:shadow-indigo-500/40 disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
        חבר לטלגרם
      </button>
      {botUsername && (
        <p className="text-center text-[11px] text-text-muted">
          בוט: <span className="font-mono">@{botUsername}</span>
        </p>
      )}
    </div>
  );
}

function PendingLinkView({
  linkCode,
  onCopy,
  onCancel,
  onRefresh,
}: {
  linkCode: LinkCode;
  onCopy: () => void;
  onCancel: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border-weak bg-surface-2/60 p-3">
        <p className="text-xs font-semibold text-text-muted">קוד חיבור חד-פעמי</p>
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-surface-1 px-3 py-2">
          <code className="font-mono text-base font-bold tracking-widest text-accent-primary">
            {linkCode.code}
          </code>
          <button
            type="button"
            onClick={onCopy}
            aria-label="העתק"
            className="rounded p-1 text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={linkCode.deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#229ED9] px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-[#1f8ec5]"
        >
          <Smartphone size={14} />
          באפליקציה
        </a>
        <a
          href={buildWebLink(linkCode.botUsername, linkCode.code)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#229ED9]/40 bg-[#229ED9]/10 px-3 py-2.5 text-xs font-bold text-[#229ED9] transition hover:bg-[#229ED9]/20 dark:text-sky-300"
        >
          <Globe size={14} />
          בטלגרם ווב
        </a>
      </div>
      <div className="rounded-xl border border-dashed border-border-weak bg-surface-2/40 p-3 text-xs text-text-secondary">
        <p className="font-semibold text-text-primary">איך זה עובד?</p>
        <ol className="mt-1.5 list-decimal space-y-1 pr-4">
          <li>בחר &quot;באפליקציה&quot; או &quot;בטלגרם ווב&quot;</li>
          <li>בצ&apos;אט שייפתח, לחץ Start / התחל</li>
          <li>החיבור יושלם אוטומטית תוך מספר שניות</li>
        </ol>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-weak bg-surface-2 px-3 py-1.5 font-semibold text-text-secondary transition hover:border-accent-primary/50 hover:text-text-primary disabled:opacity-60"
        >
          {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          רענן
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-text-muted transition hover:text-rose-500"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}

function LinkedView({
  status,
  linkedAtLabel,
  busyAction,
  onTest,
  onUnlink,
}: {
  status: LinkStatus;
  linkedAtLabel: string | null;
  busyAction: string | null;
  onTest: () => void;
  onUnlink: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/70 p-3 dark:border-emerald-400/30 dark:bg-emerald-500/10">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
            <Check size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">
              החשבון מחובר
            </p>
            <p className="truncate text-[11px] text-emerald-700/80 dark:text-emerald-300/70">
              {status.username ? `@${status.username}` : `Chat ID: ${status.chatId}`}
            </p>
          </div>
        </div>
        {linkedAtLabel && (
          <p className="mt-2 text-[11px] text-emerald-700/70 dark:text-emerald-300/70">
            מחובר מאז {linkedAtLabel}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onTest}
          disabled={busyAction === "test"}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-weak bg-surface-2 px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-accent-primary/50 disabled:opacity-60"
        >
          {busyAction === "test" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          הודעת בדיקה
        </button>
        <button
          type="button"
          onClick={onUnlink}
          disabled={busyAction === "unlink"}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300/60 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
        >
          {busyAction === "unlink" ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
          נתק
        </button>
      </div>
    </div>
  );
}

function BroadcastSection({
  text,
  setText,
  onSend,
  busy,
}: {
  text: string;
  setText: (value: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-violet-300/60 bg-violet-50/60 p-3 dark:border-violet-400/30 dark:bg-violet-500/10">
      <p className="text-xs font-bold text-violet-700 dark:text-violet-200">שידור לכל המשתמשים</p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        placeholder="כתוב את ההודעה לכל המשתמשים המחוברים..."
        className="w-full resize-none rounded-lg border border-border-weak bg-surface-1 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={busy || !text.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-violet-700 disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        שלח לכולם
      </button>
    </div>
  );
}
