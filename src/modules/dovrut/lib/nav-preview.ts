"use client";

import { useCallback, useEffect, useState } from "react";
import { DOVRUT_MUTATED_EVENT } from "@/modules/dovrut/lib/dovrut-fetch";

export type DovrutNavPreviewKey =
  | "campaigns"
  | "projects"
  | "items"
  | "inquiry"
  | "tasks"
  | "approvals";

export type DovrutSidePreviewKey = "campaigns" | "projects" | "items" | "inquiry";

export interface DovrutNavPreviewRow {
  id: string;
  name: string;
  href: string;
}

export interface DovrutNavPreview {
  campaigns: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  items: Array<{ id: string; name: string }>;
  inquirySubjects: Array<{ id: string; name: string }>;
  tasks: Array<{ id: string; title: string }>;
  approvals: Array<{ id: string; name: string; approval_status: string | null }>;
}

const SIDE_PREVIEW_HREFS: Record<DovrutSidePreviewKey, string> = {
  campaigns: "/dovrut/campaigns",
  projects: "/dovrut/projects",
  items: "/dovrut/items",
  inquiry: "/dovrut/inquiry-subjects",
};

export function previewKeyForHref(href: string): DovrutSidePreviewKey | null {
  const match = (Object.entries(SIDE_PREVIEW_HREFS) as Array<[DovrutSidePreviewKey, string]>).find(
    ([, path]) => path === href,
  );
  return match?.[0] ?? null;
}

export function rowsForNavPreview(
  preview: DovrutNavPreview | null,
  key: DovrutNavPreviewKey,
): DovrutNavPreviewRow[] {
  if (!preview) return [];
  if (key === "campaigns") {
    return preview.campaigns.map((row) => ({
      id: row.id,
      name: row.name,
      href: `/dovrut/projects?campaignId=${row.id}`,
    }));
  }
  if (key === "projects") {
    return preview.projects.map((row) => ({
      id: row.id,
      name: row.name,
      href: `/dovrut/projects/${row.id}`,
    }));
  }
  if (key === "items") {
    return preview.items.map((row) => ({
      id: row.id,
      name: row.name,
      href: `/dovrut/items/${row.id}`,
    }));
  }
  if (key === "inquiry") {
    return (preview.inquirySubjects ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      href: `/dovrut/inquiry-subjects/${row.id}`,
    }));
  }
  if (key === "tasks") {
    return preview.tasks.map((row) => ({
      id: row.id,
      name: row.title,
      href: "/dovrut/tasks",
    }));
  }
  return preview.approvals.map((row) => ({
    id: row.id,
    name: row.name,
    href: `/dovrut/approvals?item=${row.id}`,
  }));
}

export function useDovrutNavPreview() {
  const [preview, setPreview] = useState<DovrutNavPreview | null>(null);

  const loadPreview = useCallback(async () => {
    const response = await fetch("/api/dovrut/nav-preview", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as DovrutNavPreview;
    setPreview(data);
  }, []);

  useEffect(() => {
    const onMutate = () => {
      void loadPreview();
    };
    window.addEventListener(DOVRUT_MUTATED_EVENT, onMutate);
    return () => window.removeEventListener(DOVRUT_MUTATED_EVENT, onMutate);
  }, [loadPreview]);

  return { preview, loadPreview };
}
