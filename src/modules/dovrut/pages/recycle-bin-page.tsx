"use client";

import { useCallback, useEffect, useState } from "react";
import { dovrutFetch } from "@/modules/dovrut/lib/dovrut-fetch";
import type { DovrutConcept, DovrutProject } from "@/modules/dovrut/types";

export function DovrutRecycleBinPage() {
  const [projects, setProjects] = useState<DovrutProject[]>([]);
  const [items, setItems] = useState<DovrutConcept[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [projectsData, itemsData] = await Promise.all([
        dovrutFetch<{ projects: DovrutProject[] }>("/api/dovrut/projects?scope=deleted"),
        dovrutFetch<{ concepts: DovrutConcept[] }>("/api/dovrut/concepts?scope=deleted"),
      ]);
      setProjects(projectsData.projects);
      setItems(itemsData.concepts);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const restoreProject = async (id: string) => {
    const snapshot = projects;
    setProjects((rows) => rows.filter((row) => row.id !== id));
    setBusy(id);
    setError("");
    try {
      await dovrutFetch(`/api/dovrut/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify({ restore: true }),
      });
    } catch {
      setProjects(snapshot);
      setError("שחזור פרויקט נכשל");
    } finally {
      setBusy(null);
    }
  };

  const purgeProject = async (id: string) => {
    if (!window.confirm("למחוק את הפרויקט לצמיתות?")) return;
    const snapshot = projects;
    setProjects((rows) => rows.filter((row) => row.id !== id));
    setBusy(id);
    setError("");
    try {
      await dovrutFetch(`/api/dovrut/projects/${id}?purge=1`, { method: "DELETE" });
    } catch {
      setProjects(snapshot);
      setError("מחיקה לצמיתות נכשלה");
    } finally {
      setBusy(null);
    }
  };

  const restoreItem = async (id: string) => {
    const snapshot = items;
    setItems((rows) => rows.filter((row) => row.id !== id));
    setBusy(id);
    setError("");
    try {
      await dovrutFetch(`/api/dovrut/concepts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ restore: true }),
      });
    } catch {
      setItems(snapshot);
      setError("שחזור אייטם נכשל");
    } finally {
      setBusy(null);
    }
  };

  const purgeItem = async (id: string) => {
    if (!window.confirm("למחוק את האייטם לצמיתות?")) return;
    const snapshot = items;
    setItems((rows) => rows.filter((row) => row.id !== id));
    setBusy(id);
    setError("");
    try {
      await dovrutFetch(`/api/dovrut/concepts/${id}?purge=1`, { method: "DELETE" });
    } catch {
      setItems(snapshot);
      setError("מחיקה לצמיתות נכשלה");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">סל מחזור</h1>
        <p className="mt-1 text-sm text-text-muted">שחזור או מחיקה לצמיתות של פרויקטים ואייטמים</p>
      </div>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      <section>
        <h2 className="mb-2 text-sm font-extrabold">פרויקטים</h2>
        <ul className="space-y-2">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
            >
              <div>
                <p className="text-sm font-bold">{project.name}</p>
                <p className="text-[11px] text-text-muted">{project.campaign_name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy === project.id}
                  onClick={() => void restoreProject(project.id)}
                  className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"
                >
                  שחזר
                </button>
                <button
                  type="button"
                  disabled={busy === project.id}
                  onClick={() => void purgeProject(project.id)}
                  className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
                >
                  מחק לצמיתות
                </button>
              </div>
            </li>
          ))}
          {projects.length === 0 ? (
            <p className="text-sm text-text-muted">אין פרויקטים בסל</p>
          ) : null}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-extrabold">אייטמים</h2>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
            >
              <div>
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-[11px] text-text-muted">{item.project_name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => void restoreItem(item.id)}
                  className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"
                >
                  שחזר
                </button>
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => void purgeItem(item.id)}
                  className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
                >
                  מחק לצמיתות
                </button>
              </div>
            </li>
          ))}
          {items.length === 0 ? <p className="text-sm text-text-muted">אין אייטמים בסל</p> : null}
        </ul>
      </section>
    </div>
  );
}
