"use client";

import { useEffect, useState } from "react";
import { emitDovrutMutated } from "@/modules/dovrut/lib/dovrut-fetch";
import type { DovrutCampaign, DovrutCampaignStatus } from "@/modules/dovrut/types";

const STATUS_OPTIONS: Array<{ value: DovrutCampaignStatus; label: string }> = [
  { value: "active", label: "פעיל" },
  { value: "on_hold", label: "מושהה" },
  { value: "completed", label: "הושלם" },
  { value: "draft", label: "טיוטה" },
];

export function CampaignForm({
  campaign,
  layout = "stacked",
  onSaved,
}: {
  campaign?: DovrutCampaign | null;
  layout?: "stacked" | "grid";
  onSaved?: () => void;
}) {
  const isEdit = Boolean(campaign);
  const [name, setName] = useState(campaign?.name ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
  const [status, setStatus] = useState<DovrutCampaignStatus>(campaign?.status ?? "active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(campaign?.name ?? "");
    setDescription(campaign?.description ?? "");
    setStatus(campaign?.status ?? "active");
  }, [campaign]);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(isEdit ? `/api/dovrut/campaigns/${campaign!.id}` : "/api/dovrut/campaigns", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          status,
        }),
      });
      if (!response.ok) {
        setError(isEdit ? "עדכון קמפיין נכשל" : "יצירת קמפיין נכשלה");
        return;
      }
      if (!isEdit) {
        setName("");
        setDescription("");
        setStatus("active");
      }
      emitDovrutMutated();
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={layout === "grid" ? "grid gap-2 sm:grid-cols-2" : "space-y-3"}>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="שם הקמפיין"
        className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
      />
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as DovrutCampaignStatus)}
        className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
        {saving ? "שומר…" : isEdit ? "שמירת שינויים" : "צור קמפיין"}
      </button>
      {error ? (
        <p className={`text-xs font-semibold text-rose-600 ${layout === "grid" ? "sm:col-span-2" : ""}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CampaignCreateForm({
  layout = "stacked",
  onCreated,
}: {
  layout?: "stacked" | "grid";
  onCreated?: () => void;
}) {
  return <CampaignForm layout={layout} onSaved={onCreated} />;
}
