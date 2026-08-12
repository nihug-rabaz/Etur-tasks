"use client";

import { Bell, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OneSignalWebClient } from "@/lib/onesignal/onesignal-web-client";

interface Recipient {
  id: string;
  name: string;
  avatar: string | null;
}

export function OneSignalTestPanel() {
  const [users, setUsers] = useState<Recipient[]>([]);
  const [userId, setUserId] = useState("");
  const [sendReady, setSendReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [optedIn, setOptedIn] = useState(false);
  const [busy, setBusy] = useState<"optin" | "send" | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/onesignal/test", {
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          const data = (await response.json()) as {
            sendReady?: boolean;
            users?: Recipient[];
          };
          if (!cancelled) {
            setSendReady(Boolean(data.sendReady));
            setUsers(Array.isArray(data.users) ? data.users : []);
          }
        }
      } catch {
        if (!cancelled) setSendReady(false);
      }

      const enabled = await OneSignalWebClient.isOptedIn();
      if (!cancelled) {
        setOptedIn(enabled);
        setReady(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const enableNotifications = async () => {
    setBusy("optin");
    try {
      const enabled = await OneSignalWebClient.requestOptIn();
      setOptedIn(enabled);
      if (enabled) toast.success("התראות הדפדפן הופעלו");
      else toast.error("לא ניתן להפעיל התראות בכתובת הזו. השתמשו באתר הייצור.");
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    if (!userId) {
      toast.error("בחרו משתמש לשליחת הבדיקה");
      return;
    }
    setBusy("send");
    try {
      const response = await fetch("/api/admin/onesignal/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        signal: AbortSignal.timeout(15000),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.status === 503) {
        toast.error("חסר ONESIGNAL_REST_API_KEY בשרת");
        return;
      }
      if (!response.ok) {
        toast.error(data.error ? `השליחה נכשלה: ${data.error}` : "שליחת הודעת הבדיקה נכשלה");
        return;
      }
      toast.success("הודעת הבדיקה נשלחה למשתמש שנבחר");
    } catch {
      toast.error("השליחה נכשלה או שפגה");
    } finally {
      setBusy(null);
    }
  };

  if (!OneSignalWebClient.isConfigured()) {
    return (
      <article className="dashboard-glass rounded-3xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-text-primary">התראות דפדפן</h2>
        <p className="mt-1 text-sm text-text-secondary">OneSignal לא מוגדר בסביבה זו.</p>
      </article>
    );
  }

  return (
    <article className="dashboard-glass rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary">התראות דפדפן</h2>
          <p className="mt-1 text-sm text-text-secondary">
            בחרו משתמש ושלחו הודעת בדיקה רק אליו. ההתראה מגיעה רק אם הוא אישר התראות באתר הייצור.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            optedIn
              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-100"
              : "bg-surface-2 text-text-secondary"
          }`}
        >
          <Bell size={12} />
          {ready ? (optedIn ? "מופעל במכשיר זה" : "לא מופעל כאן") : "טוען…"}
        </span>
      </div>

      <label className="mt-4 block text-xs font-bold text-text-secondary">משתמש לבדיקה</label>
      <select
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
        disabled={busy !== null}
        className="mt-1.5 w-full max-w-md rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-semibold text-text-primary outline-none focus:ring-2 focus:ring-accent-primary/30"
      >
        <option value="">בחרו משתמש</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>

      {!sendReady ? (
        <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
          חסר ONESIGNAL_REST_API_KEY ב־.env.local — בלי זה אי אפשר לשלוח.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null || optedIn}
          onClick={() => void enableNotifications()}
          className="inline-flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs font-bold text-text-primary transition hover:bg-surface-2/80 disabled:opacity-50"
        >
          {busy === "optin" ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
          הפעל התראות במכשיר זה
        </button>
        <button
          type="button"
          disabled={busy !== null || !userId || !sendReady}
          onClick={() => void sendTest()}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-primary px-3 py-2 text-xs font-bold text-white transition hover:brightness-105 disabled:opacity-50"
        >
          {busy === "send" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          שלח הודעת בדיקה
        </button>
      </div>
    </article>
  );
}
