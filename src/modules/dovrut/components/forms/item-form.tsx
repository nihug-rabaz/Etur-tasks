"use client";

import { useEffect, useState } from "react";
import { DovrutCheckboxGroup } from "@/modules/dovrut/components/checkbox-group";
import {
  DEFAULT_APPROVAL_FLAGS,
  DOMAIN_LABELS,
  getInitialApprovalStatus,
} from "@/modules/dovrut/lib/approval-flows";
import { emitDovrutMutated } from "@/modules/dovrut/lib/dovrut-fetch";
import { DOVRUT_AUDIENCES } from "@/modules/dovrut/lib/audiences";
import type { DovrutConceptType, DovrutProject } from "@/modules/dovrut/types";

export function ItemCreateForm({
  layout = "stacked",
  defaultProjectId = "",
  onCreated,
}: {
  layout?: "stacked" | "grid";
  defaultProjectId?: string;
  onCreated?: () => void;
}) {
  const [projects, setProjects] = useState<DovrutProject[]>([]);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [type, setType] = useState<DovrutConceptType>("article_interview");
  const [audiences, setAudiences] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>(["kashrut"]);
  const [mediaOutlet, setMediaOutlet] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [needsBriefing, setNeedsBriefing] = useState(true);
  const [requiresChief, setRequiresChief] = useState(DEFAULT_APPROVAL_FLAGS.requires_chief_rabbi);
  const [requiresDeputy, setRequiresDeputy] = useState(
    DEFAULT_APPROVAL_FLAGS.requires_deputy_commander,
  );
  const [requiresBranch, setRequiresBranch] = useState(DEFAULT_APPROVAL_FLAGS.requires_branch_head);
  const [isDraft, setIsDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (defaultProjectId) {
      setProjectId(defaultProjectId);
      return;
    }
    void fetch("/api/dovrut/projects")
      .then((response) => response.json())
      .then((data) => {
        const rows = Array.isArray(data.projects) ? (data.projects as DovrutProject[]) : [];
        setProjects(rows.filter((row) => row.status === "active"));
      });
  }, [defaultProjectId]);

  const submit = async () => {
    if (!name.trim() || !projectId) return;
    setSaving(true);
    setError("");
    try {
      const payload =
        type === "article_interview"
          ? {
              name: name.trim(),
              project_id: projectId,
              type,
              domains,
              domain: domains[0] ?? null,
              target_audiences: audiences,
              target_audience: audiences[0] ?? null,
              media_outlet: mediaOutlet.trim() || null,
              interviewer: interviewer.trim() || null,
              needs_briefing: needsBriefing,
              requires_chief_rabbi: requiresChief,
              requires_deputy_commander: requiresDeputy,
              requires_branch_head: requiresBranch,
              is_draft: isDraft,
            }
          : {
              name: name.trim(),
              project_id: projectId,
              type,
              content_type: "text",
              target_audiences: audiences,
              target_audience: audiences[0] ?? null,
              domains,
              is_draft: isDraft,
            };
      const response = await fetch("/api/dovrut/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setError("יצירת אייטם נכשלה");
        return;
      }
      setName("");
      setAudiences([]);
      setDomains(["kashrut"]);
      setMediaOutlet("");
      setInterviewer("");
      setNeedsBriefing(true);
      setRequiresChief(DEFAULT_APPROVAL_FLAGS.requires_chief_rabbi);
      setRequiresDeputy(DEFAULT_APPROVAL_FLAGS.requires_deputy_commander);
      setRequiresBranch(DEFAULT_APPROVAL_FLAGS.requires_branch_head);
      setIsDraft(false);
      emitDovrutMutated();
      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  const previewFlags = {
    requires_chief_rabbi: requiresChief,
    requires_deputy_commander: requiresDeputy,
    requires_branch_head: requiresBranch,
  };

  return (
    <div className={layout === "grid" ? "grid gap-2 sm:grid-cols-2" : "space-y-3"}>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="שם האייטם"
        className={`w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800 ${
          layout === "grid" ? "sm:col-span-2" : ""
        }`}
      />
      {defaultProjectId ? null : (
        <select
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className={`w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 ${
            layout === "grid" ? "sm:col-span-2" : ""
          }`}
        >
          <option value="">בחרו פרויקט</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      )}
      <select
        value={type}
        onChange={(event) => setType(event.target.value as DovrutConceptType)}
        className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
      >
        <option value="article_interview">כתבה / ראיון</option>
        <option value="social_media">רשתות חברתיות</option>
      </select>
      <DovrutCheckboxGroup
        label="קהלי יעד"
        options={DOVRUT_AUDIENCES.map((value) => ({ value, label: value }))}
        values={audiences}
        onChange={setAudiences}
      />
      <DovrutCheckboxGroup
        label="תחומים"
        options={Object.entries(DOMAIN_LABELS).map(([value, label]) => ({ value, label }))}
        values={domains}
        onChange={setDomains}
      />
      {type === "article_interview" ? (
        <>
          <input
            value={mediaOutlet}
            onChange={(event) => setMediaOutlet(event.target.value)}
            placeholder="מערכת"
            className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <input
            value={interviewer}
            onChange={(event) => setInterviewer(event.target.value)}
            placeholder="שם המראיין"
            className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <div
            className={`space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50 ${
              layout === "grid" ? "sm:col-span-2" : ""
            }`}
          >
            <p className="text-xs font-bold text-text-secondary">אישורים נדרשים</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requiresChief}
                onChange={(event) => setRequiresChief(event.target.checked)}
              />
              רבצ״ר
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requiresDeputy}
                onChange={(event) => setRequiresDeputy(event.target.checked)}
              />
              רמ״ט
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requiresBranch}
                onChange={(event) => setRequiresBranch(event.target.checked)}
              />
              רמ״ח
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={needsBriefing}
                onChange={(event) => setNeedsBriefing(event.target.checked)}
              />
              צריך לתדרך
            </label>
            <p className="text-[11px] text-text-muted">
              התחלת אישור: {getInitialApprovalStatus(previewFlags)}
            </p>
          </div>
        </>
      ) : null}
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={isDraft}
          onChange={(event) => setIsDraft(event.target.checked)}
        />
        שמור כטיוטה
      </label>
      <button
        type="button"
        disabled={saving || !name.trim() || !projectId}
        onClick={() => void submit()}
        className={`rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40 ${
          layout === "grid" ? "sm:col-span-2 w-fit" : ""
        }`}
      >
        {saving ? "שומר…" : "צור אייטם"}
      </button>
      {error ? (
        <p className={`text-xs font-semibold text-rose-600 ${layout === "grid" ? "sm:col-span-2" : ""}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
