"use client";

import { useState } from "react";

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
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="מילת חיפוש מדויקת"
          className="min-w-0 flex-1 rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none dark:bg-slate-800"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void search(1)}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"
        >
          {loading ? "…" : "חפש"}
        </button>
      </div>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      <ul className="space-y-2">
        {articles.map((article) => (
          <li
            key={article.id}
            className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]"
          >
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-extrabold text-violet-700 hover:underline"
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
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold disabled:opacity-40 dark:bg-slate-800"
          >
            הקודם
          </button>
          <button
            type="button"
            disabled={loading || !hasNext}
            onClick={() => void search(nextStart)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold disabled:opacity-40 dark:bg-slate-800"
          >
            הבא
          </button>
        </div>
      ) : null}
    </div>
  );
}
