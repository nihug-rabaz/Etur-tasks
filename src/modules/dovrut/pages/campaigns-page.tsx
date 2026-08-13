"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CampaignCreateForm } from "@/modules/dovrut/components/forms/campaign-form";
import type { DovrutCampaign } from "@/modules/dovrut/types";

export function DovrutCampaignsPage() {
  const [campaigns, setCampaigns] = useState<DovrutCampaign[]>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/dovrut/campaigns");
    const data = await response.json();
    setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">קמפיינים</h1>
        <p className="mt-1 text-sm text-text-muted">קמפיין ← פרויקט ← אייטם</p>
      </div>
      <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">קמפיין חדש</h2>
        <CampaignCreateForm layout="grid" onCreated={() => void load()} />
      </div>
      <ul className="space-y-2">
        {campaigns.map((campaign) => (
          <li
            key={campaign.id}
            className="rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
          >
            <p className="text-sm font-bold">{campaign.name}</p>
            <p className="text-[11px] text-text-muted">
              {campaign.status}
              {campaign.description ? ` · ${campaign.description}` : ""}
            </p>
            <Link
              href={`/dovrut/projects?campaignId=${campaign.id}`}
              className="mt-2 inline-block text-xs font-bold text-violet-600"
            >
              לפרויקטים של הקמפיין →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
