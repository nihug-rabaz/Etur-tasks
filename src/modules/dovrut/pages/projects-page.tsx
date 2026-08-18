"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dovrutFetch } from "@/modules/dovrut/lib/dovrut-fetch";
import { useDovrutMutatedReload } from "@/modules/dovrut/lib/use-dovrut-reload";
import type { DovrutProject } from "@/modules/dovrut/types";

export function DovrutProjectsPage() {
  const searchParams = useSearchParams();
  const campaignFilter = searchParams.get("campaignId") ?? "";
  const [projects, setProjects] = useState<DovrutProject[]>([]);
  const [query, setQuery] = useState("");
  const [draftsOnly, setDraftsOnly] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (draftsOnly) params.set("scope", "drafts");
      if (campaignFilter) params.set("campaignId", campaignFilter);
      const data = await dovrutFetch<{ projects: DovrutProject[] }>(
        `/api/dovrut/projects?${params.toString()}`,
      );
      setProjects(data.projects);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    }
  }, [draftsOnly, campaignFilter]);

  useEffect(() => {
    void load();
  }, [load]);
  useDovrutMutatedReload(load);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(q) ||
        (project.description ?? "").toLowerCase().includes(q) ||
        (project.campaign_name ?? "").toLowerCase().includes(q),
    );
  }, [projects, query]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">פרויקטים תקשורתיים</h1>
          <p className="mt-1 text-sm text-text-muted">תחת קמפיין · יצירה מהכפתור +</p>
          <Link href="/dovrut/projects/archive" className="mt-2 inline-block text-xs font-bold text-violet-700">
            לארכיון פרויקטים →
          </Link>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            checked={draftsOnly}
            onChange={(event) => setDraftsOnly(event.target.checked)}
          />
          טיוטות
        </label>
      </div>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="חיפוש פרויקט"
        className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none dark:bg-slate-800"
      />
      <ul className="space-y-2">
        {filtered.map((project) => (
          <li key={project.id}>
            <Link
              href={`/dovrut/projects/${project.id}`}
              className="block rounded-2xl border border-black/8 bg-white px-4 py-3 transition hover:border-violet-300 dark:border-white/10 dark:bg-[#161922]"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-text-primary">{project.name}</h3>
                <span className="text-[11px] font-bold text-text-muted">{project.status}</span>
              </div>
              {project.campaign_name ? (
                <p className="mt-0.5 text-[11px] font-semibold text-violet-700">
                  קמפיין · {project.campaign_name}
                </p>
              ) : null}
              {project.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{project.description}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
