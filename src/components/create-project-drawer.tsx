"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

interface OptionItem {
  id: string;
  name: string;
  domain_id?: string;
}

function normalizeLabel(value: string): string {
  return value
    .trim()
    .replace(/["'׳״]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

interface CreateProjectDrawerProps {
  triggerLabel?: string;
  defaultSubtopicId?: string;
  lockSubtopic?: boolean;
  allowedDomainId?: string;
  allowedDomainSlug?: string;
  allowedSubtopicIds?: string[];
  allowedSubtopicLabels?: string[];
}

export function CreateProjectDrawer({
  triggerLabel = "פרויקט חדש",
  defaultSubtopicId,
  lockSubtopic = false,
  allowedDomainId,
  allowedDomainSlug,
  allowedSubtopicIds,
  allowedSubtopicLabels,
}: CreateProjectDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subtopics, setSubtopics] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [subtopicId, setSubtopicId] = useState(defaultSubtopicId ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const params = new URLSearchParams();
      if (allowedDomainId) params.set("domainId", allowedDomainId);
      if (allowedDomainSlug) params.set("domainSlug", allowedDomainSlug);
      const query = params.toString();
      const response = await fetch(`/api/create-options${query ? `?${query}` : ""}`);
      if (!response.ok) return;
      const data = await response.json();
      const allSubtopics = (data.subtopics ?? []) as OptionItem[];
      const scopedByDomain = Boolean(allowedDomainId || allowedDomainSlug);
      let filteredSubtopics: OptionItem[];

      if (scopedByDomain) {
        filteredSubtopics = allSubtopics;
      } else {
        const idScopedSubtopics = allowedSubtopicIds?.length
          ? allSubtopics.filter((item) => allowedSubtopicIds.includes(item.id))
          : allSubtopics;
        const normalizedAllowedLabels = new Set(
          (allowedSubtopicLabels ?? []).map((label) => normalizeLabel(label)),
        );
        const labelScopedSubtopics = normalizedAllowedLabels.size
          ? allSubtopics.filter((item) =>
              normalizedAllowedLabels.has(normalizeLabel(toHebrewSubtopicLabel(item.name))),
            )
          : [];
        const hasScopedFilter = Boolean(allowedSubtopicIds?.length || allowedSubtopicLabels?.length);
        filteredSubtopics = hasScopedFilter
          ? (labelScopedSubtopics.length > 0 ? labelScopedSubtopics : idScopedSubtopics)
          : allSubtopics;
      }

      setSubtopics(filteredSubtopics);
      setSubtopicId((current) => {
        const stillValid = filteredSubtopics.some((item) => item.id === current);
        if (stillValid) return current;
        return defaultSubtopicId ?? filteredSubtopics[0]?.id ?? "";
      });
    };
    load();
  }, [
    open,
    defaultSubtopicId,
    allowedDomainId,
    allowedDomainSlug,
    allowedSubtopicIds,
    allowedSubtopicLabels,
  ]);

  const submit = async () => {
    setError("");
    if (!name.trim()) {
      setError("שם פרויקט הוא שדה חובה");
      return;
    }
    if (!subtopicId) {
      setError("יש לבחור תת-נושא");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        subtopicId,
        startDate: startDate || null,
        endDate: endDate || null,
        description: description || null,
        status,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError("לא הצלחנו ליצור פרויקט, נסה שוב");
      return;
    }
    toast.success("הפרויקט נוצר בהצלחה 🎯");
    setOpen(false);
    setName("");
    setDescription("");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-500 dark:text-white dark:hover:bg-slate-400"
      >
        <Plus size={16} />
        {triggerLabel}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="יצירת פרויקט חדש"
        subtitle="ארגן משימות תחת פרויקט אחד מסודר"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">שם פרויקט</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="הזן שם פרויקט..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">תת-נושא</label>
            <select
              value={subtopicId}
              onChange={(event) => setSubtopicId(event.target.value)}
              disabled={lockSubtopic}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">בחר תת-נושא</option>
              {subtopics.map((item) => (
                <option key={item.id} value={item.id}>
                  {toHebrewSubtopicLabel(item.name)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="תיאור"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="active">פעיל</option>
            <option value="archived">מתוכנן</option>
            <option value="completed">הושלם</option>
          </select>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
            >
              ביטול
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={submit}
              className="rounded-xl bg-gradient-to-l from-purple-600 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              יצירת פרויקט
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
