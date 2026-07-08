"use client";

import Image from "next/image";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { compressTabIconFile } from "@/lib/images/tab-icon";
import { invalidateDomainTabAppearanceCache } from "@/hooks/use-domain-tab-appearance";
import {
  DomainTabAppearanceMap,
  domainTabIconLabels,
  domainTabLabel,
  resolveDomainTabIcon,
  type DomainTabIconName,
} from "@/lib/ui/domain-tab-appearance";
import { domainKeys, domainMeta, type DomainKey } from "@/lib/ui/domains";

export function DomainTabsSettingsPanel() {
  const [appearance, setAppearance] = useState<DomainTabAppearanceMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<DomainKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/domain-tabs/appearance");
        if (!response.ok) return;
        const data = (await response.json()) as { appearance?: DomainTabAppearanceMap };
        if (!cancelled && data.appearance) setAppearance(data.appearance);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateIcon = async (slug: DomainKey, icon: DomainTabIconName) => {
    setBusySlug(slug);
    try {
      const response = await fetch("/api/admin/domain-tabs/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, icon }),
      });
      if (!response.ok) {
        toast.error("לא הצלחנו לשמור את האייקון");
        return;
      }
      const data = (await response.json()) as { appearance?: DomainTabAppearanceMap };
      if (data.appearance) {
        setAppearance(data.appearance);
        invalidateDomainTabAppearanceCache();
        toast.success("האייקון עודכן");
      }
    } finally {
      setBusySlug(null);
    }
  };

  const uploadImage = async (slug: DomainKey, file: File) => {
    setBusySlug(slug);
    try {
      const compressed = await compressTabIconFile(file);
      const blob = await fetch(compressed).then((res) => res.blob());
      const formData = new FormData();
      formData.append("file", new File([blob], "tab-icon.jpg", { type: blob.type || "image/jpeg" }));
      const response = await fetch(`/api/admin/domain-tabs/${slug}/image`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        toast.error("לא הצלחנו להעלות את התמונה");
        return;
      }
      const data = (await response.json()) as { appearance?: DomainTabAppearanceMap };
      if (data.appearance) {
        setAppearance(data.appearance);
        invalidateDomainTabAppearanceCache();
        toast.success("התמונה הועלתה");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העלאה נכשלה");
    } finally {
      setBusySlug(null);
    }
  };

  const removeImage = async (slug: DomainKey) => {
    setBusySlug(slug);
    try {
      const response = await fetch(`/api/admin/domain-tabs/${slug}/image`, { method: "DELETE" });
      if (!response.ok) {
        toast.error("לא הצלחנו להסיר את התמונה");
        return;
      }
      const data = (await response.json()) as { appearance?: DomainTabAppearanceMap };
      if (data.appearance) {
        setAppearance(data.appearance);
        invalidateDomainTabAppearanceCache();
        toast.success("התמונה הוסרה");
      }
    } finally {
      setBusySlug(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-secondary">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!appearance) {
    return (
      <div className="rounded-2xl bg-surface-2/70 px-4 py-8 text-center text-sm text-text-secondary">
        לא הצלחנו לטעון את הגדרות הטאבים.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {domainKeys.map((slug) => {
        const item = appearance[slug];
        const Icon = resolveDomainTabIcon(item.icon);
        const accent = domainMeta[slug].accentHex;
        const isBusy = busySlug === slug;
        return (
          <article key={slug} className="dashboard-glass rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-text-primary">{domainTabLabel(slug)}</p>
                <p className="text-xs text-text-muted">טאב במסך הראשי</p>
              </div>
              <span
                className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ring-2 ring-white/80 shadow-md"
                style={{ backgroundColor: `${accent}22` }}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={domainTabLabel(slug)}
                    width={56}
                    height={56}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icon size={24} style={{ color: accent }} />
                )}
              </span>
            </div>

            <label className="mb-2 block text-xs font-bold text-text-secondary">אייקון</label>
            <select
              value={item.icon}
              disabled={isBusy}
              onChange={(event) => void updateIcon(slug, event.target.value as DomainTabIconName)}
              className="mb-4 w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-semibold text-text-primary outline-none focus:ring-2 focus:ring-accent-primary/30"
            >
              {Object.entries(domainTabIconLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent-primary px-3 py-2 text-xs font-bold text-white transition hover:brightness-105">
                {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                העלאת תמונה
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={isBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadImage(slug, file);
                  }}
                />
              </label>
              {item.imageUrl ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void removeImage(slug)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-xs font-bold text-text-secondary transition hover:text-rose-600"
                >
                  <Trash2 size={14} />
                  הסר תמונה
                </button>
              ) : null}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
              תמונה עגולה תוצג במקום האייקון בטאב. מומלץ תמונה מרובעת.
            </p>
          </article>
        );
      })}
    </div>
  );
}
