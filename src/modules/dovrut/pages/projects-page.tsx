"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DovrutProject, DovrutProjectStatus } from "@/modules/dovrut/types";

export function DovrutProjectsPage() {
  const [projects, setProjects] = useState<DovrutProject[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<DovrutProjectStatus>("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/dovrut/projects");
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
        (project.description ?? "").toLowerCase().includes(q),
    );
  }, [projects, query]);

  const createProject = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dovrut/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          status,
        }),
      });
      if (!response.ok) {
        setError("יצירת פרויקט נכשלה");
        return;
      }
      setName("");
      setDescription("");
      setStatus("active");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">פרויקטים תקשורתיים</h1>
        <p className="mt-1 text-sm text-text-muted">קמפיינים של מדור הדוברות</p>
      </div>

      <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">פרויקט חדש</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="שם הפרויקט"
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as DovrutProjectStatus)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
          >
            <option value="active">פעיל</option>
            <option value="completed">הושלם</option>
            <option value="on_hold">מושהה</option>
          </select>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="תיאור"
            className="min-h-20 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none sm:col-span-2 dark:bg-slate-800"
          />
        </div>
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() => void createProject()}
          className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? "שומר…" : "צור פרויקט"}
        </button>
        {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
      </div>

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
