"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DOMAIN_LABELS } from "@/modules/dovrut/lib/approval-flows";
import { dovrutFetch } from "@/modules/dovrut/lib/dovrut-fetch";
import { useDovrutMutatedReload } from "@/modules/dovrut/lib/use-dovrut-reload";
import type { DovrutConcept, DovrutConceptType, DovrutProject } from "@/modules/dovrut/types";

export function DovrutProjectDetailsPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<DovrutProject | null>(null);
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
  const [tab, setTab] = useState<"all" | DovrutConceptType>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [projectData, conceptsData] = await Promise.all([
        dovrutFetch<{ project: DovrutProject | null }>(`/api/dovrut/projects/${projectId}`),
        dovrutFetch<{ concepts: DovrutConcept[] }>(`/api/dovrut/concepts?projectId=${projectId}`),
      ]);
      setProject(projectData.project ?? null);
      setConcepts(conceptsData.concepts);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);
  useDovrutMutatedReload(load);

  const archive = async () => {
    if (!window.confirm("לסיים את הפרויקט ולהעביר לארכיון?")) return;
    setBusy(true);
    try {
      await dovrutFetch(`/api/dovrut/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "completed" }),
      });
      window.location.href = "/dovrut/projects/archive";
    } catch (err) {
      setError(err instanceof Error ? err.message : "ארכוב נכשל");
      setBusy(false);
    }
  };

  const moveToBin = async () => {
    if (!window.confirm("להעביר את הפרויקט לסל מחזור?")) return;
    setBusy(true);
    try {
      await dovrutFetch(`/api/dovrut/projects/${projectId}`, { method: "DELETE" });
      window.location.href = "/dovrut/recycle-bin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "מחיקה נכשלה");
      setBusy(false);
    }
  };

  if (!project && !error) {
    return <div className="text-sm text-text-muted">טוען פרויקט…</div>;
  }
  if (!project) return <p className="text-sm text-rose-600">{error}</p>;

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
        {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {project.status !== "completed" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void archive()}
              className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold disabled:opacity-40 dark:bg-slate-800"
            >
              סיים ושלח לארכיון
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void moveToBin()}
            className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-40"
          >
            מחק לסל מחזור
          </button>
        </div>
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
