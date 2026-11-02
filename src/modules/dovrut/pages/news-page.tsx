"use client";

import { useCallback, useEffect, useState } from "react";

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string | null;
  source: string;
  imageUrl: string | null;
}

export function DovrutNewsPage() {
  const [q, setQ] = useState("");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [start, setStart] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [nextStart, setNextStart] = useState(11);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [keywordsBusy, setKeywordsBusy] = useState(false);
  const [keywordsMsg, setKeywordsMsg] = useState("");
  const [canEditKeywords, setCanEditKeywords] = useState(false);

  const loadKeywords = useCallback(async () => {
    try {
      const response = await fetch("/api/dovrut/admin/workflow-settings");
      const data = await response.json();
      if (response.status === 403 || response.status === 401) {
        setCanEditKeywords(false);
        return;
      }
      if (!response.ok) return;
      setCanEditKeywords(true);
      setKeywords(
        Array.isArray(data.settings?.news_keywords) ? data.settings.news_keywords : [],
      );
    } catch {
      setCanEditKeywords(false);
    }
  }, []);

  useEffect(() => {
    void loadKeywords();
  }, [loadKeywords]);

  const saveKeywords = async (next: string[]) => {
    setKeywordsBusy(true);
    setKeywordsMsg("");
    try {
      const response = await fetch("/api/dovrut/admin/workflow-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_keywords: next }),
      });
      const data = await response.json();
      if (!response.ok) {
        setKeywordsMsg(data.error || "שמירה נכשלה");
        return;
      }
      setKeywords(
        Array.isArray(data.settings?.news_keywords) ? data.settings.news_keywords : next,
      );
      setKeywordsMsg("מילות מפתח נשמרו");
    } finally {
      setKeywordsBusy(false);
    }
  };

  const addKeyword = async () => {
    const value = newKeyword.trim();
    if (!value) return;
    if (keywords.includes(value)) {
      setKeywordsMsg("מילת המפתח כבר קיימת");
      return;
    }
    setNewKeyword("");
    await saveKeywords([...keywords, value]);
  };

  const removeKeyword = async (value: string) => {
    await saveKeywords(keywords.filter((k) => k !== value));
  };

  const search = async (startIndex = 1) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/dovrut/news/search?q=${encodeURIComponent(q.trim())}&start=${startIndex}`,
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "חיפוש נכשל");
        return;
      }
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setStart(data.currentStart ?? startIndex);
      setHasNext(Boolean(data.hasNextPage));
      setNextStart(data.nextStartIndex ?? startIndex + 10);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-3 py-4 sm:px-0 sm:py-0">
      <h1 className="text-xl font-bold text-text-primary">חיפוש חדשות</h1>

      {canEditKeywords ? (
        <section className="dashboard-glass rounded-3xl p-4">
          <h2 className="mb-1 text-sm font-extrabold">מילות מפתח למעקב אוטומטי</h2>
          <p className="mb-3 text-xs text-text-muted">
            ה־cron מחפש כל 30 דקות (07:00–22:00 שעון ישראל) ומתריע על כתבות חדשות.
          </p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <button
                key={keyword}
                type="button"
                disabled={keywordsBusy}
                onClick={() => void removeKeyword(keyword)}
                className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold transition hover:bg-rose-100 hover:text-rose-700 disabled:opacity-40"
                title="הסר"
              >
                {keyword} ×
              </button>
            ))}
            {keywords.length === 0 ? (
              <p className="text-xs text-text-muted">אין מילות מפתח עדיין</p>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addKeyword();
                }
              }}
              placeholder="מילת מפתח חדשה"
              className="min-w-0 flex-1 rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              disabled={keywordsBusy || !newKeyword.trim()}
              onClick={() => void addKeyword()}
              className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              הוסף
            </button>
          </div>
          {keywordsMsg ? (
            <p className="mt-2 text-xs font-semibold text-accent-primary">{keywordsMsg}</p>
          ) : null}
        </section>
      ) : null}

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="מילת חיפוש מדויקת"
          className="min-w-0 flex-1 rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void search(1)}
          className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white"
        >
          {loading ? "…" : "חפש"}
        </button>
      </div>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      <ul className="space-y-2">
        {articles.map((article) => (
          <li key={article.id} className="dashboard-glass rounded-3xl p-4">
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-extrabold text-accent-primary hover:underline"
            >
              {article.title}
            </a>
            <p className="mt-1 text-xs text-text-muted">
              {article.source}
              {article.publishedAt ? ` · ${article.publishedAt}` : ""}
            </p>
            <p className="mt-2 text-sm text-text-secondary">{article.description}</p>
          </li>
        ))}
      </ul>
      {articles.length > 0 ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || start <= 1}
            onClick={() => void search(Math.max(1, start - 10))}
            className="rounded-xl bg-surface-2 px-3 py-2 text-xs font-bold disabled:opacity-40"
          >
            הקודם
          </button>
          <button
            type="button"
            disabled={loading || !hasNext}
            onClick={() => void search(nextStart)}
            className="rounded-xl bg-surface-2 px-3 py-2 text-xs font-bold disabled:opacity-40"
          >
            הבא
          </button>
        </div>
      ) : null}
    </div>
  );
}
