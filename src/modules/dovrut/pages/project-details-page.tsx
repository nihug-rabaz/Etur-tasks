"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ItemCreateForm } from "@/modules/dovrut/components/forms/item-form";
import { DOMAIN_LABELS } from "@/modules/dovrut/lib/approval-flows";
import type { DovrutConcept, DovrutConceptType, DovrutProject } from "@/modules/dovrut/types";

export function DovrutProjectDetailsPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<DovrutProject | null>(null);
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
  const [tab, setTab] = useState<"all" | DovrutConceptType>("all");

  const load = useCallback(async () => {
    const [projectRes, conceptsRes] = await Promise.all([
      fetch(`/api/dovrut/projects/${projectId}`),
      fetch(`/api/dovrut/concepts?projectId=${projectId}`),
    ]);
    const projectData = await projectRes.json();
    const conceptsData = await conceptsRes.json();
    setProject(projectData.project ?? null);
    setConcepts(Array.isArray(conceptsData.concepts) ? conceptsData.concepts : []);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!project) {
    return <div className="text-sm text-text-muted">טוען פרויקט…</div>;
  }

  const visible = concepts.filter((concept) => (tab === "all" ? true : concept.type === tab));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <Link href="/dovrut/projects" className="text-xs font-bold text-violet-600">
          ← חזרה לפרויקטים
        </Link>
        <h1 className="mt-2 text-xl font-bold text-text-primary">{project.name}</h1>
        {project.campaign_name ? (
          <p className="mt-1 text-xs font-semibold text-violet-700">קמפיין · {project.campaign_name}</p>
        ) : null}
        {project.description ? (
          <p className="mt-1 text-sm text-text-secondary">{project.description}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {project.status !== "completed" ? (
            <button
              type="button"
              onClick={() =>
                void fetch(`/api/dovrut/projects/${projectId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "completed" }),
                }).then(() => load())
              }
              className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold dark:bg-slate-800"
            >
              סיים ושלח לארכיון
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              void fetch(`/api/dovrut/projects/${projectId}`, { method: "DELETE" }).then(() => {
                window.location.href = "/dovrut/recycle-bin";
              })
            }
            className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
          >
            מחק לסל מחזור
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">אייטם חדש</h2>
        <ItemCreateForm layout="grid" defaultProjectId={projectId} onCreated={() => void load()} />
      </div>

      <div className="flex gap-2">
        {[
          { id: "all", label: "הכל" },
          { id: "article_interview", label: "כתבות" },
          { id: "social_media", label: "רשתות" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as typeof tab)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              tab === item.id
                ? "bg-violet-600 text-white"
                : "bg-slate-100 text-text-secondary dark:bg-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {visible.map((concept) => (
          <li key={concept.id}>
            <Link
              href={`/dovrut/items/${concept.id}`}
              className="block rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
            >
              <p className="text-sm font-bold text-text-primary">{concept.name}</p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {concept.type === "article_interview" ? "כתבה/ראיון" : "רשתות"}
                {(concept.domains ?? []).length
                  ? ` · ${(concept.domains ?? []).map((value) => DOMAIN_LABELS[value] ?? value).join(", ")}`
                  : concept.domain
                    ? ` · ${DOMAIN_LABELS[concept.domain]}`
                    : ""}
                {(concept.target_audiences ?? []).length
                  ? ` · קהל: ${(concept.target_audiences ?? []).join(", ")}`
                  : concept.target_audience
                    ? ` · קהל: ${concept.target_audience}`
                    : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
