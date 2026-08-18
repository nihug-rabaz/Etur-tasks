"use client";

import { useEffect, useState } from "react";
import { DovrutCheckboxGroup } from "@/modules/dovrut/components/checkbox-group";
import { emitDovrutMutated } from "@/modules/dovrut/lib/dovrut-fetch";
import { DOVRUT_AUDIENCES } from "@/modules/dovrut/lib/audiences";
import type { DovrutCampaign, DovrutProjectStatus } from "@/modules/dovrut/types";

export function ProjectCreateForm({
  layout = "stacked",
  defaultCampaignId = "",
  onCreated,
}: {
  layout?: "stacked" | "grid";
  defaultCampaignId?: string;
  onCreated?: () => void;
}) {
  const [campaigns, setCampaigns] = useState<DovrutCampaign[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<DovrutProjectStatus>("active");
  const [campaignId, setCampaignId] = useState(defaultCampaignId);
  const [audiences, setAudiences] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/dovrut/campaigns")
      .then((response) => response.json())
      .then((data) => setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []));
  }, []);

  useEffect(() => {
    if (defaultCampaignId) setCampaignId(defaultCampaignId);
  }, [defaultCampaignId]);

  const submit = async () => {
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
          target_audiences: audiences,
        }),
      });
      if (!response.ok) {
        setError("יצירת פרויקט נכשלה");
        return;
      }
      setName("");
      setDescription("");
      setStatus("active");
      setAudiences([]);
      emitDovrutMutated();
      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={layout === "grid" ? "grid gap-2 sm:grid-cols-2" : "space-y-3"}>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="שם הפרויקט"
        className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
      />
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as DovrutProjectStatus)}
        className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
      >
        <option value="active">פעיל</option>
        <option value="draft">טיוטה</option>
        <option value="on_hold">מושהה</option>
      </select>
      <select
        value={campaignId}
        onChange={(event) => setCampaignId(event.target.value)}
        className={`w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 ${
          layout === "grid" ? "sm:col-span-2" : ""
        }`}
      >
        <option value="">ללא קמפיין</option>
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </select>
      <DovrutCheckboxGroup
        label="קהלי יעד"
        options={DOVRUT_AUDIENCES.map((value) => ({ value, label: value }))}
        values={audiences}
        onChange={setAudiences}
      />
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="תיאור"
        className={`min-h-20 w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800 ${
          layout === "grid" ? "sm:col-span-2" : "min-h-24"
        }`}
      />
      <button
        type="button"
        disabled={saving || !name.trim()}
        onClick={() => void submit()}
        className={`rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40 ${
          layout === "grid" ? "sm:col-span-2 w-fit" : ""
        }`}
      >
        {saving ? "שומר…" : "צור פרויקט"}
      </button>
      {error ? (
        <p className={`text-xs font-semibold text-rose-600 ${layout === "grid" ? "sm:col-span-2" : ""}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
