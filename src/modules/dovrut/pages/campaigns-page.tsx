"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DovrutCampaign, DovrutCampaignStatus } from "@/modules/dovrut/types";

export function DovrutCampaignsPage() {
  const [campaigns, setCampaigns] = useState<DovrutCampaign[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<DovrutCampaignStatus>("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/dovrut/campaigns");
    const data = await response.json();
    setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createCampaign = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dovrut/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          status,
        }),
      });
      if (!response.ok) {
        setError("יצירת קמפיין נכשלה");
        return;
      }
      setName("");
      setDescription("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">קמפיינים</h1>
        <p className="mt-1 text-sm text-text-muted">קמפיין ← פרויקט ← פריט</p>
      </div>
      <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">קמפיין חדש</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם הקמפיין"
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DovrutCampaignStatus)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
          >
            <option value="active">פעיל</option>
            <option value="completed">הושלם</option>
            <option value="on_hold">מושהה</option>
          </select>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="תיאור"
            className="min-h-20 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none sm:col-span-2 dark:bg-slate-800"
          />
        </div>
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() => void createCampaign()}
          className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          צור קמפיין
        </button>
        {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
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
