"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DovrutCampaign, DovrutProject, DovrutProjectStatus } from "@/modules/dovrut/types";

export function DovrutProjectsPage() {
  const searchParams = useSearchParams();
  const campaignFilter = searchParams.get("campaignId") ?? "";
  const [projects, setProjects] = useState<DovrutProject[]>([]);
  const [campaigns, setCampaigns] = useState<DovrutCampaign[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<DovrutProjectStatus>("active");
  const [campaignId, setCampaignId] = useState(campaignFilter);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [projectsRes, campaignsRes] = await Promise.all([
      fetch("/api/dovrut/projects"),
      fetch("/api/dovrut/campaigns"),
    ]);
    const projectsData = await projectsRes.json();
    const campaignsData = await campaignsRes.json();
    setProjects(Array.isArray(projectsData.projects) ? projectsData.projects : []);
    setCampaigns(Array.isArray(campaignsData.campaigns) ? campaignsData.campaigns : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (campaignFilter) setCampaignId(campaignFilter);
  }, [campaignFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (campaignFilter && project.campaign_id !== campaignFilter) return false;
      if (!q) return true;
      return (
        project.name.toLowerCase().includes(q) ||
        (project.description ?? "").toLowerCase().includes(q) ||
        (project.campaign_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [projects, query, campaignFilter]);

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
          campaign_id: campaignId || null,
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
        <p className="mt-1 text-sm text-text-muted">תחת קמפיין · פרויקט ← פריט</p>
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
          <select
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm sm:col-span-2 dark:bg-slate-800"
          >
            <option value="">ללא קמפיין</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
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
