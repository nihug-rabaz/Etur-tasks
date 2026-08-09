"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  DovrutConcept,
  DovrutConceptType,
  DovrutDomain,
  DovrutProject,
} from "@/modules/dovrut/types";
import {
  DEFAULT_APPROVAL_FLAGS,
  DOMAIN_LABELS,
  getInitialApprovalStatus,
} from "@/modules/dovrut/lib/approval-flows";

export function DovrutProjectDetailsPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<DovrutProject | null>(null);
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
  const [tab, setTab] = useState<"all" | DovrutConceptType>("all");
  const [name, setName] = useState("");
  const [type, setType] = useState<DovrutConceptType>("article_interview");
  const [domain, setDomain] = useState<DovrutDomain>("kashrut");
  const [targetAudience, setTargetAudience] = useState("");
  const [mediaOutlet, setMediaOutlet] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [needsBriefing, setNeedsBriefing] = useState(true);
  const [requiresChief, setRequiresChief] = useState(DEFAULT_APPROVAL_FLAGS.requires_chief_rabbi);
  const [requiresDeputy, setRequiresDeputy] = useState(
    DEFAULT_APPROVAL_FLAGS.requires_deputy_commander,
  );
  const [requiresBranch, setRequiresBranch] = useState(DEFAULT_APPROVAL_FLAGS.requires_branch_head);
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
          ? {
              name: name.trim(),
              project_id: projectId,
              type,
              domain,
              target_audience: targetAudience.trim() || null,
              media_outlet: mediaOutlet.trim() || null,
              interviewer: interviewer.trim() || null,
              needs_briefing: needsBriefing,
              requires_chief_rabbi: requiresChief,
              requires_deputy_commander: requiresDeputy,
              requires_branch_head: requiresBranch,
            }
          : {
              name: name.trim(),
              project_id: projectId,
              type,
              content_type: "text",
              target_audience: targetAudience.trim() || null,
            };
      const response = await fetch("/api/dovrut/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setError("יצירת פריט נכשלה");
        return;
      }
      setName("");
      setMediaOutlet("");
      setInterviewer("");
      setTargetAudience("");
      setNeedsBriefing(true);
      setRequiresChief(true);
      setRequiresDeputy(true);
      setRequiresBranch(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!project) {
    return <div className="text-sm text-text-muted">טוען פרויקט…</div>;
  }

  const previewFlags = {
    requires_chief_rabbi: requiresChief,
    requires_deputy_commander: requiresDeputy,
    requires_branch_head: requiresBranch,
  };

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
      </div>

      <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">פריט חדש</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="שם הפריט"
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
          <input
            value={targetAudience}
            onChange={(event) => setTargetAudience(event.target.value)}
            placeholder="קהל יעד"
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          {type === "article_interview" ? (
            <>
              <select
                value={domain}
                onChange={(event) => setDomain(event.target.value as DovrutDomain)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm sm:col-span-2 dark:bg-slate-800"
              >
                {Object.entries(DOMAIN_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    תחום · {label}
                  </option>
                ))}
              </select>
              <input
                value={mediaOutlet}
                onChange={(event) => setMediaOutlet(event.target.value)}
                placeholder="מערכת"
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
              />
              <input
                value={interviewer}
                onChange={(event) => setInterviewer(event.target.value)}
                placeholder="שם המראיין (אופציונלי)"
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
              />
              <div className="sm:col-span-2 space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
                <p className="text-xs font-bold text-text-secondary">אישורים נדרשים (מעל תדרוך)</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requiresChief}
                    onChange={(e) => setRequiresChief(e.target.checked)}
                  />
                  רבצ״ר
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requiresDeputy}
                    onChange={(e) => setRequiresDeputy(e.target.checked)}
                  />
                  רמ״ט
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requiresBranch}
                    onChange={(e) => setRequiresBranch(e.target.checked)}
                  />
                  רמ״ח
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={needsBriefing}
                    onChange={(e) => setNeedsBriefing(e.target.checked)}
                  />
                  צריך לתדרך
                </label>
                <p className="text-[11px] text-text-muted">
                  התחלת אישור: {getInitialApprovalStatus(previewFlags)}
                </p>
              </div>
            </>
          ) : null}
        </div>
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() => void createConcept()}
          className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? "שומר…" : "צור פריט"}
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
              href={`/dovrut/items/${concept.id}`}
              className="block rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
            >
              <p className="text-sm font-bold text-text-primary">{concept.name}</p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {concept.type === "article_interview" ? "כתבה/ראיון" : "רשתות"}
                {concept.domain ? ` · ${DOMAIN_LABELS[concept.domain]}` : ""}
                {concept.target_audience ? ` · קהל: ${concept.target_audience}` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
