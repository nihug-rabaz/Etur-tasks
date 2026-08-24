"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DovrutAudienceMessage, DovrutDomain } from "@/modules/dovrut/types";
import { DOMAIN_LABELS } from "@/modules/dovrut/lib/approval-flows";
import { DOVRUT_AUDIENCES, type DovrutAudience } from "@/modules/dovrut/lib/audiences";

export function DovrutAudiencesPage() {
  const [messages, setMessages] = useState<DovrutAudienceMessage[]>([]);
  const [audience, setAudience] = useState<DovrutAudience | "">(DOVRUT_AUDIENCES[0]);
  const [filter, setFilter] = useState<DovrutAudience | "all">("all");
  const [domain, setDomain] = useState<DovrutDomain | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const query = filter === "all" ? "" : `?audience=${encodeURIComponent(filter)}`;
    const response = await fetch(`/api/dovrut/audiences${query}`);
    const data = await response.json();
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, DovrutAudienceMessage[]>();
    for (const audienceName of DOVRUT_AUDIENCES) buckets.set(audienceName, []);
    for (const message of messages) {
      const list = buckets.get(message.audience) ?? [];
      list.push(message);
      buckets.set(message.audience, list);
    }
    return buckets;
  }, [messages]);

  const createMessage = async () => {
    if (!audience || !title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dovrut/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          domain: domain || null,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      if (!response.ok) {
        setError("שמירת מסר נכשלה");
        return;
      }
      setTitle("");
      setBody("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-3 py-4 sm:px-0 sm:py-0">
      <div>
        <h1 className="text-xl font-bold text-text-primary">מסרים</h1>
        <p className="mt-1 text-sm text-text-muted">מסרים לפי קהל יעד ותחום</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            filter === "all"
              ? "bg-violet-600 text-white"
              : "bg-slate-100 text-text-primary dark:bg-slate-800"
          }`}
        >
          הכל
        </button>
        {DOVRUT_AUDIENCES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              filter === value
                ? "bg-violet-600 text-white"
                : "bg-slate-100 text-text-primary dark:bg-slate-800"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">מסר חדש</h2>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as DovrutAudience)}
              className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
            >
              {DOVRUT_AUDIENCES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value as DovrutDomain | "")}
              className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
            >
              <option value="">ללא תחום</option>
              {Object.entries(DOMAIN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="כותרת מסר"
            className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="גוף המסר"
            className="min-h-24 w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
        </div>
        <button
          type="button"
          disabled={saving || !audience || !title.trim()}
          onClick={() => void createMessage()}
          className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          שמור מסר
        </button>
        {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
      </div>

      {(filter === "all" ? DOVRUT_AUDIENCES : [filter]).map((audienceName) => {
        const list = grouped.get(audienceName) ?? [];
        return (
          <section key={audienceName} className="flex flex-col gap-2">
            <h2 className="text-sm font-extrabold text-text-primary">{audienceName}</h2>
            {list.length === 0 ? (
              <p className="rounded-xl border border-dashed border-black/10 px-4 py-6 text-center text-sm text-text-muted dark:border-white/15">
                אין מסרים לקהל זה
              </p>
            ) : (
              <ul className="space-y-2">
                {list.map((message) => (
                  <li
                    key={message.id}
                    className="min-w-0 overflow-hidden rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
                  >
                    <p className="break-words text-sm font-bold">{message.title}</p>
                    <p className="text-[11px] text-text-muted">
                      {message.domain ? `תחום: ${DOMAIN_LABELS[message.domain]}` : "ללא תחום"}
                    </p>
                    {message.body ? (
                      <p className="mt-1 break-words text-sm text-text-secondary">{message.body}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
