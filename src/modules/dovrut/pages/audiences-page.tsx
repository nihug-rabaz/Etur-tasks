"use client";

import { useCallback, useEffect, useState } from "react";
import type { DovrutAudienceMessage, DovrutDomain } from "@/modules/dovrut/types";
import { DOMAIN_LABELS } from "@/modules/dovrut/lib/approval-flows";

export function DovrutAudiencesPage() {
  const [messages, setMessages] = useState<DovrutAudienceMessage[]>([]);
  const [audience, setAudience] = useState("");
  const [domain, setDomain] = useState<DovrutDomain | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/dovrut/audiences");
    const data = await response.json();
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createMessage = async () => {
    if (!audience.trim() || !title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dovrut/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: audience.trim(),
          domain: domain || null,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      if (!response.ok) {
        setError("שמירת מסר נכשלה");
        return;
      }
      setAudience("");
      setDomain("");
      setTitle("");
      setBody("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">קהלי יעד ומסרים</h1>
        <p className="mt-1 text-sm text-text-muted">מסרים לקהל יעד ולתחום</p>
      </div>
      <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">מסר חדש</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="קהל יעד"
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as DovrutDomain | "")}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
          >
            <option value="">ללא תחום</option>
            {Object.entries(DOMAIN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="כותרת מסר"
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none sm:col-span-2 dark:bg-slate-800"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="גוף המסר"
            className="min-h-24 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none sm:col-span-2 dark:bg-slate-800"
          />
        </div>
        <button
          type="button"
          disabled={saving || !audience.trim() || !title.trim()}
          onClick={() => void createMessage()}
          className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          שמור מסר
        </button>
        {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
      </div>
      <ul className="space-y-2">
        {messages.map((message) => (
          <li
            key={message.id}
            className="rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
          >
            <p className="text-sm font-bold">{message.title}</p>
            <p className="text-[11px] text-text-muted">
              קהל: {message.audience}
              {message.domain ? ` · תחום: ${DOMAIN_LABELS[message.domain]}` : ""}
            </p>
            {message.body ? <p className="mt-1 text-sm text-text-secondary">{message.body}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
