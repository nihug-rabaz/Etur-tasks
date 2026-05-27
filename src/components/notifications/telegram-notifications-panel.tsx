"use client";

import {
  Bell,
  Check,
  Globe,
  Link2,
  Loader2,
  Megaphone,
  Monitor,
  QrCode,
  RefreshCw,
  Send,
  Sparkles,
  Unlink,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

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
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white transition hover:border-white/45 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <Bell size={16} />
        {status?.linked && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_2px_#0a3a5e]" />
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
                  onUnlink={unlink}
                />
              ) : linkCode ? (
                <PendingLinkView
                  linkCode={linkCode}
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

              {isAdmin ? <AdminBroadcastForm onResult={setBanner} /> : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminBroadcastForm({ onResult }: { onResult: (banner: Banner) => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sendingRef.current) return;
    const text = message.trim();
    if (!text) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const response = await fetch("/api/telegram/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        onResult({ tone: "error", text: data?.error ?? "שליחת ההודעה נכשלה" });
        return;
      }
      setMessage("");
      onResult({
        tone: "success",
        text: `נשלח ל-${data.sent ?? 0} מתוך ${data.total ?? 0} משתמשים`,
      });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const canSend = !sending && message.trim().length > 0;

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border p-3"
      style={{
        backgroundColor: "rgba(99, 102, 241, 0.08)",
        borderColor: "rgba(99, 102, 241, 0.35)",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(99, 102, 241, 0.18)", color: "#4f46e5" }}
        >
          <Megaphone size={14} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: "#4338ca" }}>
            שליחה לכל המשתמשים
          </p>
          <p className="text-[11px]" style={{ color: "#6366f1" }}>
            ישלח כהודעה לכל מי שמחובר לטלגרם
          </p>
        </div>
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="הקלד את ההודעה כאן..."
        rows={3}
        maxLength={4000}
        className="w-full resize-y rounded-lg border px-3 py-2 text-sm text-text-primary outline-none transition"
        style={{
          backgroundColor: "rgba(255,255,255,0.9)",
          borderColor: "rgba(99, 102, 241, 0.35)",
        }}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-text-muted">{message.length} / 4000</span>
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
          style={{
            backgroundColor: canSend ? "#4f46e5" : "#a5b4fc",
            cursor: canSend ? "pointer" : "not-allowed",
          }}
        >
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          שליחה
        </button>
      </div>
    </form>
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

type PendingTab = "qr" | "app" | "web";

function PendingLinkView({
  linkCode,
  onCancel,
  onRefresh,
}: {
  linkCode: LinkCode;
  onCancel: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<PendingTab>("qr");

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const webLink = buildWebLink(linkCode.botUsername, linkCode.code);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <TabButton active={tab === "qr"} onClick={() => setTab("qr")} icon={<QrCode size={14} />} label="סרוק QR" />
        <TabButton active={tab === "web"} onClick={() => setTab("web")} icon={<Globe size={14} />} label="טלגרם ווב" />
        <TabButton active={tab === "app"} onClick={() => setTab("app")} icon={<Monitor size={14} />} label="באפליקציה" />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {tab === "qr" && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-violet-300/60 bg-gradient-to-b from-white to-violet-50/60 p-3 dark:border-violet-400/30 dark:from-slate-900 dark:to-violet-500/10">
              <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-black/5">
                <QRCodeSVG
                  value={linkCode.deepLink}
                  size={168}
                  level="M"
                  marginSize={0}
                  bgColor="#ffffff"
                  fgColor="#1e1b4b"
                />
              </div>
              <p className="text-center text-[11px] leading-relaxed text-text-secondary">
                סרוק עם מצלמת הטלפון כדי לפתוח צ&apos;אט עם הבוט
                <br />
                <span className="font-mono text-text-muted">@{linkCode.botUsername}</span>
              </p>
            </div>
          )}

          {tab === "web" && (
            <a
              href={webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#229ED9]/40 bg-[#229ED9]/10 px-3 py-3 text-sm font-bold text-[#229ED9] transition hover:bg-[#229ED9]/20 dark:text-sky-300"
            >
              <Globe size={16} />
              פתח ב-Telegram Web
            </a>
          )}

          {tab === "app" && (
            <a
              href={linkCode.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-3 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-[#1f8ec5]"
            >
              <Monitor size={16} />
              פתח באפליקציית טלגרם
            </a>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="rounded-xl border border-dashed border-border-weak bg-surface-2/40 p-3 text-xs text-text-secondary">
        <p className="font-semibold text-text-primary">איך זה עובד?</p>
        <ol className="mt-1.5 list-decimal space-y-1 pr-4">
          <li>פתח בטלגרם דרך אחת מהאפשרויות (QR, ווב או אפליקציה)</li>
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

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
        active
          ? "border-accent-primary/60 bg-accent-primary/10 text-accent-primary"
          : "border-border-weak bg-surface-2 text-text-primary hover:border-accent-primary/40"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function LinkedView({
  status,
  linkedAtLabel,
  busyAction,
  onUnlink,
}: {
  status: LinkStatus;
  linkedAtLabel: string | null;
  busyAction: string | null;
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
      <div>
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

