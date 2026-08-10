"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DovrutConcept, DovrutProject } from "@/modules/dovrut/types";
import {
  APPROVAL_STATUS_LABELS,
  WORK_STATUS_LABELS,
} from "@/modules/dovrut/lib/approval-flows";

function isActiveItem(concept: DovrutConcept): boolean {
  const work =
    concept.type === "article_interview"
      ? concept.work_status_article
      : concept.work_status_social;
  return work !== "approved";
}

export function DovrutDashboardPage() {
  const [projects, setProjects] = useState<DovrutProject[]>([]);
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
  const [quickProjectName, setQuickProjectName] = useState("");
  const [quickItemName, setQuickItemName] = useState("");
  const [quickProjectId, setQuickProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsRes, conceptsRes] = await Promise.all([
        fetch("/api/dovrut/projects"),
        fetch("/api/dovrut/concepts"),
      ]);
      const projectsData = await projectsRes.json();
      const conceptsData = await conceptsRes.json();
      const nextProjects = Array.isArray(projectsData.projects) ? projectsData.projects : [];
      setProjects(nextProjects);
      setConcepts(Array.isArray(conceptsData.concepts) ? conceptsData.concepts : []);
      if (!quickProjectId && nextProjects[0]) setQuickProjectId(nextProjects[0].id);
    } finally {
      setLoading(false);
    }
  }, [quickProjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active"),
    [projects],
  );
  const activeItems = useMemo(() => concepts.filter(isActiveItem), [concepts]);
  const waitingApprovals = useMemo(
    () => concepts.filter((c) => c.approval_status && c.approval_status !== "approved"),
    [concepts],
  );
  const approvedCount = useMemo(
    () =>
      concepts.filter(
        (c) =>
          c.work_status_article === "approved" ||
          c.work_status_social === "approved" ||
          c.approval_status === "approved",
      ).length,
    [concepts],
  );

  const createQuickProject = async () => {
    if (!quickProjectName.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/dovrut/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: quickProjectName.trim() }),
      });
      if (!response.ok) {
        setMessage("יצירת פרויקט נכשלה");
        return;
      }
      setQuickProjectName("");
      await load();
      setMessage("פרויקט נוצר");
    } finally {
      setSaving(false);
    }
  };

  const createQuickItem = async () => {
    if (!quickItemName.trim() || !quickProjectId) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/dovrut/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickItemName.trim(),
          project_id: quickProjectId,
          type: "article_interview",
          domain: "kashrut",
        }),
      });
      if (!response.ok) {
        setMessage("יצירת פריט נכשלה");
        return;
      }
      setQuickItemName("");
      await load();
      setMessage("פריט נוצר");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-text-muted">טוען דשבורד דוברות…</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">דוברות</h1>
        <p className="mt-1 text-sm text-text-secondary">דשבורד פעילים · יצירה מהירה</p>
      </div>

      <section className="grid gap-3 rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922] md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-extrabold">פרויקט מהיר</h2>
          <div className="flex gap-2">
            <input
              value={quickProjectName}
              onChange={(e) => setQuickProjectName(e.target.value)}
              placeholder="שם פרויקט"
              className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
            />
            <button
              type="button"
              disabled={saving || !quickProjectName.trim()}
              onClick={() => void createQuickProject()}
              className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              צור
            </button>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-extrabold">פריט מהיר (כתבה)</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={quickProjectId}
              onChange={(e) => setQuickProjectId(e.target.value)}
              className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <input
              value={quickItemName}
              onChange={(e) => setQuickItemName(e.target.value)}
              placeholder="שם פריט"
              className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
            />
            <button
              type="button"
              disabled={saving || !quickItemName.trim() || !quickProjectId}
              onClick={() => void createQuickItem()}
              className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              צור
            </button>
          </div>
        </div>
        {message ? <p className="text-xs font-semibold text-violet-700 md:col-span-2">{message}</p> : null}
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "פרויקטים פעילים", value: activeProjects.length },
          { label: "פריטים פעילים", value: activeItems.length },
          { label: "ממתינים לאישור", value: waitingApprovals.length },
          { label: "מאושרים", value: approvedCount },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]"
          >
            <p className="text-xs font-semibold text-text-muted">{item.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-text-primary">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold text-text-primary">פריטים פעילים</h2>
        <ul className="space-y-2">
          {activeItems.slice(0, 12).map((concept) => (
            <li key={concept.id}>
              <Link
                href={`/dovrut/items/${concept.id}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-text-primary">{concept.name}</p>
                  <p className="truncate text-[11px] text-text-muted">
                    {concept.project_name} ·{" "}
                    {concept.type === "article_interview" ? "כתבה/ראיון" : "רשתות"}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-text-muted">
                  {concept.type === "article_interview"
                    ? concept.approval_status
                      ? APPROVAL_STATUS_LABELS[concept.approval_status]
                      : WORK_STATUS_LABELS[concept.work_status_article ?? "planning"]
                    : WORK_STATUS_LABELS[concept.work_status_social ?? "planning"]}
                </span>
              </Link>
            </li>
          ))}
          {activeItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">אין פריטים פעילים</p>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
