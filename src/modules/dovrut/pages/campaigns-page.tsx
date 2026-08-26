"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EditCampaignDrawer } from "@/modules/dovrut/components/create-campaign-drawer";
import { dovrutFetch, emitDovrutMutated } from "@/modules/dovrut/lib/dovrut-fetch";
import { useDovrutMutatedReload } from "@/modules/dovrut/lib/use-dovrut-reload";
import type { DovrutCampaign } from "@/modules/dovrut/types";

const STATUS_LABELS: Record<string, string> = {
  active: "פעיל",
  on_hold: "מושהה",
  completed: "הושלם",
  draft: "טיוטה",
};

export function DovrutCampaignsPage() {
  const [campaigns, setCampaigns] = useState<DovrutCampaign[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DovrutCampaign | null>(null);

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

  const softDelete = async (campaign: DovrutCampaign) => {
    if (
      !window.confirm(
        `למחוק את הקמפיין "${campaign.name}"?\nהקמפיין והפרויקטים שלו יעברו לטיוטה ויהיה ניתן לשחזר למשך 30 יום מסל המחזור.`,
      )
    ) {
      return;
    }
    setBusyId(campaign.id);
    setError("");
    try {
      await dovrutFetch(`/api/dovrut/campaigns/${campaign.id}`, { method: "DELETE" });
      emitDovrutMutated();
      await load();
    } catch {
      setError("מחיקת קמפיין נכשלה");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-3 py-4 sm:px-0 sm:py-0">
      <div>
        <h1 className="text-xl font-bold text-text-primary">קמפיינים</h1>
        <p className="mt-1 text-sm text-text-muted">
          קמפיין ← פרויקט ← אייטם · עריכה ומחיקה לטיוטה עם שחזור עד 30 יום
        </p>
      </div>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      <ul className="space-y-2">
        {campaigns.map((campaign) => (
          <li
            key={campaign.id}
            className="min-w-0 overflow-hidden rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-bold">{campaign.name}</p>
                <p className="mt-0.5 line-clamp-2 break-words text-[11px] text-text-muted">
                  {STATUS_LABELS[campaign.status] ?? campaign.status}
                  {campaign.description ? ` · ${campaign.description}` : ""}
                </p>
                <Link
                  href={`/dovrut/projects?campaignId=${campaign.id}`}
                  className="mt-2 inline-block text-xs font-bold text-violet-600"
                >
                  לפרויקטים של הקמפיין →
                </Link>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busyId === campaign.id}
                  onClick={() => setEditing(campaign)}
                  className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 disabled:opacity-40"
                >
                  עריכה
                </button>
                <button
                  type="button"
                  disabled={busyId === campaign.id}
                  onClick={() => void softDelete(campaign)}
                  className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-40"
                >
                  מחיקה
                </button>
              </div>
            </div>
          </li>
        ))}
        {campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">אין קמפיינים</p>
        ) : null}
      </ul>

      <EditCampaignDrawer
        campaign={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={() => void load()}
      />
    </div>
  );
}
