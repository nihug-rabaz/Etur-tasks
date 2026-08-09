"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DovrutConcept, DovrutConceptType, DovrutDomain, DovrutProject } from "@/modules/dovrut/types";
import { DOMAIN_LABELS, getInitialApprovalStatus } from "@/modules/dovrut/lib/approval-flows";

export function DovrutProjectDetailsPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<DovrutProject | null>(null);
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
  const [tab, setTab] = useState<"all" | DovrutConceptType>("all");
  const [name, setName] = useState("");
  const [type, setType] = useState<DovrutConceptType>("article_interview");
  const [domain, setDomain] = useState<DovrutDomain>("kashrut");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const visible = concepts.filter((concept) => (tab === "all" ? true : concept.type === tab));

  const createConcept = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload =
        type === "article_interview"
          ? { name: name.trim(), project_id: projectId, type, domain }
          : { name: name.trim(), project_id: projectId, type, content_type: "text" };
      const response = await fetch("/api/dovrut/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setError("יצירת קונספט נכשלה");
        return;
      }
      setName("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!project) {
    return <div className="text-sm text-text-muted">טוען פרויקט…</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <Link href="/dovrut/projects" className="text-xs font-bold text-violet-600">
          ← חזרה לפרויקטים
        </Link>
        <h1 className="mt-2 text-xl font-bold text-text-primary">{project.name}</h1>
        {project.description ? (
          <p className="mt-1 text-sm text-text-secondary">{project.description}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">קונספט חדש</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="שם הקונספט"
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none sm:col-span-2 dark:bg-slate-800"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as DovrutConceptType)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
          >
            <option value="article_interview">כתבה / ראיון</option>
            <option value="social_media">רשתות חברתיות</option>
          </select>
          {type === "article_interview" ? (
            <select
              value={domain}
              onChange={(event) => setDomain(event.target.value as DovrutDomain)}
              className="rounded-xl bg-slate-100 px-3 py-2 text-sm sm:col-span-3 dark:bg-slate-800"
            >
              {Object.entries(DOMAIN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label} · התחלה: {getInitialApprovalStatus(value as DovrutDomain)}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() => void createConcept()}
          className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? "שומר…" : "צור קונספט"}
        </button>
        {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
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
              href={`/dovrut/concepts/${concept.id}`}
              className="block rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
            >
              <p className="text-sm font-bold text-text-primary">{concept.name}</p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {concept.type === "article_interview" ? "כתבה/ראיון" : "רשתות"}
                {concept.domain ? ` · ${DOMAIN_LABELS[concept.domain]}` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
