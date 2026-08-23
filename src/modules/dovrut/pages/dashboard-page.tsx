"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DovrutDashboardSearch } from "@/modules/dovrut/components/dovrut-dashboard-search";
import { dovrutFetch } from "@/modules/dovrut/lib/dovrut-fetch";
import { useDovrutMutatedReload } from "@/modules/dovrut/lib/use-dovrut-reload";
import type { DovrutCampaign, DovrutConcept, DovrutProject } from "@/modules/dovrut/types";
import {
  APPROVAL_STATUS_LABELS,
  WORK_STATUS_LABELS,
} from "@/modules/dovrut/lib/approval-flows";

function isActiveItem(concept: DovrutConcept): boolean {
  if (concept.deleted_at || concept.is_draft) return false;
  const work =
    concept.type === "article_interview"
      ? concept.work_status_article
      : concept.work_status_social;
  return work !== "approved";
}

export function DovrutDashboardPage() {
  const [campaigns, setCampaigns] = useState<DovrutCampaign[]>([]);
  const [projects, setProjects] = useState<DovrutProject[]>([]);
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsData, projectsData, conceptsData] = await Promise.all([
        dovrutFetch<{ campaigns: DovrutCampaign[] }>("/api/dovrut/campaigns"),
        dovrutFetch<{ projects: DovrutProject[] }>("/api/dovrut/projects"),
        dovrutFetch<{ concepts: DovrutConcept[] }>("/api/dovrut/concepts?activeOnly=1"),
      ]);
      setCampaigns(campaignsData.campaigns);
      setProjects(projectsData.projects);
      setConcepts(conceptsData.concepts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useDovrutMutatedReload(load);

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "active"),
    [campaigns],
  );
  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active" && !project.deleted_at),
    [projects],
  );
  const activeItems = useMemo(() => concepts.filter(isActiveItem), [concepts]);
  const waitingApprovals = useMemo(
    () =>
      concepts.filter(
        (item) => item.approval_status && item.approval_status !== "approved" && !item.deleted_at,
      ),
    [concepts],
  );

  if (loading) {
    return <div className="p-6 text-sm text-text-muted">טוען דשבורד דוברות…</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">דוברות</h1>
        <p className="mt-1 text-sm text-text-secondary">קמפיינים, פרויקטים ואייטמים פעילים</p>
      </div>

      <DovrutDashboardSearch />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "קמפיינים פעילים", value: activeCampaigns.length, href: "/dovrut/campaigns" },
          { label: "פרויקטים פעילים", value: activeProjects.length, href: "/dovrut/projects" },
          { label: "אייטמים פעילים", value: activeItems.length, href: "/dovrut/items" },
          {
            label: "ממתינים לאישור",
            value: waitingApprovals.length,
            href: "/dovrut/approvals",
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl border border-black/8 bg-white p-4 transition hover:border-violet-300 dark:border-white/10 dark:bg-[#161922]"
          >
            <p className="text-xs font-semibold text-text-muted">{item.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-text-primary">{item.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ActiveList
          title="קמפיינים פעילים"
          empty="אין קמפיינים פעילים"
          href="/dovrut/campaigns"
          rows={activeCampaigns.slice(0, 8).map((campaign) => ({
            id: campaign.id,
            title: campaign.name,
            href: `/dovrut/projects?campaignId=${campaign.id}`,
            meta: campaign.description,
          }))}
        />
        <ActiveList
          title="פרויקטים פעילים"
          empty="אין פרויקטים פעילים"
          href="/dovrut/projects"
          rows={activeProjects.slice(0, 8).map((project) => ({
            id: project.id,
            title: project.name,
            href: `/dovrut/projects/${project.id}`,
            meta: project.campaign_name,
          }))}
        />
        <ActiveList
          title="אייטמים פעילים"
          empty="אין אייטמים פעילים"
          href="/dovrut/items"
          rows={activeItems.slice(0, 8).map((concept) => ({
            id: concept.id,
            title: concept.name,
            href: `/dovrut/items/${concept.id}`,
            meta: `${concept.project_name ?? ""} · ${
              concept.type === "article_interview"
                ? concept.approval_status
                  ? APPROVAL_STATUS_LABELS[concept.approval_status]
                  : WORK_STATUS_LABELS[concept.work_status_article ?? "planning"]
                : WORK_STATUS_LABELS[concept.work_status_social ?? "planning"]
            }`,
          }))}
        />
      </div>
    </div>
  );
}

function ActiveList({
  title,
  empty,
  href,
  rows,
}: {
  title: string;
  empty: string;
  href: string;
  rows: Array<{ id: string; title: string; href: string; meta?: string | null }>;
}) {
  return (
    <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-text-primary">{title}</h2>
        <Link href={href} className="text-[11px] font-bold text-violet-700">
          הכל →
        </Link>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={row.href}
              className="block rounded-xl bg-slate-50 px-3 py-2.5 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800"
            >
              <p className="truncate text-sm font-bold text-text-primary">{row.title}</p>
              {row.meta ? (
                <p className="truncate text-[11px] text-text-muted">{row.meta}</p>
              ) : null}
            </Link>
          </li>
        ))}
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">{empty}</p>
        ) : null}
      </ul>
    </section>
  );
}
