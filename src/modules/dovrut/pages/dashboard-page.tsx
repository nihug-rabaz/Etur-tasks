"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DovrutConcept, DovrutProject } from "@/modules/dovrut/types";
import {
  APPROVAL_STATUS_LABELS,
  WORK_STATUS_ARTICLE_LABELS,
  WORK_STATUS_SOCIAL_LABELS,
} from "@/modules/dovrut/lib/approval-flows";

export function DovrutDashboardPage() {
  const [projects, setProjects] = useState<DovrutProject[]>([]);
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
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
      setProjects(Array.isArray(projectsData.projects) ? projectsData.projects : []);
      setConcepts(Array.isArray(conceptsData.concepts) ? conceptsData.concepts : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const waiting = concepts.filter(
      (c) => c.approval_status && c.approval_status !== "approved",
    ).length;
    const published = concepts.filter(
      (c) =>
        c.work_status_article === "published" || c.work_status_social === "published",
    ).length;
    return {
      projects: projects.length,
      concepts: concepts.length,
      waiting,
      published,
    };
  }, [projects, concepts]);

  if (loading) {
    return <div className="p-6 text-sm text-text-muted">טוען דשבורד דוברות…</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">דוברות</h1>
          <p className="mt-1 text-sm text-text-secondary">ניהול פרויקטים תקשורתיים וקונספטים</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dovrut/projects"
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"
          >
            לפרויקטים
          </Link>
          <Link
            href="/dovrut/concepts"
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-text-primary dark:bg-slate-800"
          >
            לקונספטים
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "פרויקטים", value: stats.projects },
          { label: "קונספטים", value: stats.concepts },
          { label: "ממתינים לאישור", value: stats.waiting },
          { label: "פורסמו", value: stats.published },
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
        <h2 className="mb-3 text-sm font-extrabold text-text-primary">קונספטים אחרונים</h2>
        <ul className="space-y-2">
          {concepts.slice(0, 8).map((concept) => (
            <li key={concept.id}>
              <Link
                href={`/dovrut/concepts/${concept.id}`}
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
                      : WORK_STATUS_ARTICLE_LABELS[concept.work_status_article ?? ""]
                    : WORK_STATUS_SOCIAL_LABELS[concept.work_status_social ?? ""]}
                </span>
              </Link>
            </li>
          ))}
          {concepts.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">אין קונספטים עדיין</p>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
