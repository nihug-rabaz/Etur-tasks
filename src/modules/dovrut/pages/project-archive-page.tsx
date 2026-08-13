"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DovrutProject } from "@/modules/dovrut/types";

export function DovrutProjectArchivePage() {
  const [projects, setProjects] = useState<DovrutProject[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/dovrut/projects?archived=1");
    const data = await response.json();
    setProjects(Array.isArray(data.projects) ? data.projects : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(q) ||
        (project.campaign_name ?? "").toLowerCase().includes(q) ||
        (project.description ?? "").toLowerCase().includes(q),
    );
  }, [projects, query]);

  const moveToBin = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/dovrut/projects/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setError("העברה לסל נכשלה");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">ארכיון פרויקטים</h1>
        <p className="mt-1 text-sm text-text-muted">פרויקטים שהסתיימו · חיפוש ומחיקה לסל מחזור</p>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="חיפוש ארכיון"
        className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none dark:bg-slate-800"
      />
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      <ul className="space-y-2">
        {filtered.map((project) => (
          <li
            key={project.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
          >
            <div className="min-w-0">
              <Link href={`/dovrut/projects/${project.id}`} className="text-sm font-extrabold">
                {project.name}
              </Link>
              <p className="text-[11px] text-text-muted">
                {project.campaign_name ? `${project.campaign_name} · ` : ""}
                הסתיים: {project.ended_at ? new Date(project.ended_at).toLocaleDateString("he-IL") : "—"}
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === project.id}
              onClick={() => void moveToBin(project.id)}
              className="shrink-0 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-40"
            >
              לסל מחזור
            </button>
          </li>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">אין פרויקטים בארכיון</p>
        ) : null}
      </ul>
    </div>
  );
}
