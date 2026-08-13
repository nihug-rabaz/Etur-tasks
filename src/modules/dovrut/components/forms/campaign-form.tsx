"use client";

import { useState } from "react";
import type { DovrutCampaignStatus } from "@/modules/dovrut/types";

export function CampaignCreateForm({
  layout = "stacked",
  onCreated,
}: {
  layout?: "stacked" | "grid";
  onCreated?: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<DovrutCampaignStatus>("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
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
      setStatus("active");
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
        placeholder="שם הקמפיין"
        className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
      />
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as DovrutCampaignStatus)}
        className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
      >
        <option value="active">פעיל</option>
        <option value="on_hold">מושהה</option>
        <option value="completed">הושלם</option>
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
        {saving ? "שומר…" : "צור קמפיין"}
      </button>
      {error ? (
        <p className={`text-xs font-semibold text-rose-600 ${layout === "grid" ? "sm:col-span-2" : ""}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
