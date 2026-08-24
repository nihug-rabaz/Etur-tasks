"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { dovrutFetch } from "@/modules/dovrut/lib/dovrut-fetch";
import { useDovrutMutatedReload } from "@/modules/dovrut/lib/use-dovrut-reload";
import type { DovrutCampaign } from "@/modules/dovrut/types";

export function DovrutCampaignsPage() {
  const [campaigns, setCampaigns] = useState<DovrutCampaign[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await dovrutFetch<{ campaigns: DovrutCampaign[] }>("/api/dovrut/campaigns");
      setCampaigns(data.campaigns);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useDovrutMutatedReload(load);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-3 py-4 sm:px-0 sm:py-0">
      <div>
        <h1 className="text-xl font-bold text-text-primary">קמפיינים</h1>
        <p className="mt-1 text-sm text-text-muted">קמפיין ← פרויקט ← אייטם · יצירה מהכפתור +</p>
      </div>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      <ul className="space-y-2">
        {campaigns.map((campaign) => (
          <li
            key={campaign.id}
            className="min-w-0 overflow-hidden rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
          >
            <p className="break-words text-sm font-bold">{campaign.name}</p>
            <p className="mt-0.5 line-clamp-2 break-words text-[11px] text-text-muted">
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
        {campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">אין קמפיינים</p>
        ) : null}
      </ul>
    </div>
  );
}
