"use client";

import { Check, Loader2, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { notifyFontScaleChanged } from "@/components/ui/font-scale-root";
import {
  fontScaleOptions,
  normalizeFontScalePreset,
  type FontScalePreset,
} from "@/lib/ui/font-scale";

export function ProfileFontScalePanel() {
  const [preset, setPreset] = useState<FontScalePreset>("default");
  const [loading, setLoading] = useState(true);
  const [busyPreset, setBusyPreset] = useState<FontScalePreset | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/ui/font-scale");
        if (!response.ok) return;
        const data = (await response.json()) as { preset?: string };
        if (!cancelled) setPreset(normalizeFontScalePreset(data.preset));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const savePreset = async (nextPreset: FontScalePreset) => {
    if (nextPreset === preset || busyPreset) return;
    setBusyPreset(nextPreset);
    try {
      const response = await fetch("/api/ui/font-scale", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: nextPreset }),
      });
      if (!response.ok) {
        toast.error("לא הצלחנו לשמור את גודל הפונט");
        return;
      }
      const data = (await response.json()) as { preset?: string };
      const saved = normalizeFontScalePreset(data.preset ?? nextPreset);
      setPreset(saved);
      notifyFontScaleChanged(saved);
      toast.success("גודל הפונט שלך עודכן");
    } finally {
      setBusyPreset(null);
    }
  };

  const activeOption = fontScaleOptions.find((option) => option.preset === preset) ?? fontScaleOptions[1];

  return (
    <section className="rounded-3xl border border-border-weak bg-surface-1/90 p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600 dark:text-violet-300">
            <Type size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text-primary">גודל פונט אישי</h2>
            <p className="text-sm text-text-secondary">משפיע רק על התצוגה שלך במערכת</p>
          </div>
        </div>
        {!loading ? (
          <span className="inline-flex w-fit items-center rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-700 dark:text-violet-200">
            פעיל: {activeOption.label} · {Math.round(activeOption.scale * 100)}%
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 size={16} className="animate-spin" />
          טוען הגדרות…
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {fontScaleOptions.map((option) => {
              const selected = preset === option.preset;
              const busy = busyPreset === option.preset;
              return (
                <button
                  key={option.preset}
                  type="button"
                  disabled={Boolean(busyPreset)}
                  onClick={() => savePreset(option.preset)}
                  className={`relative flex min-h-[4.5rem] flex-col justify-between rounded-xl border px-3 py-2.5 text-start transition ${
                    selected
                      ? "border-violet-400/80 bg-violet-500/10 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.15)]"
                      : "border-border-weak/70 bg-surface-2/60 hover:border-violet-300/45 hover:bg-surface-2/80"
                  }`}
                >
                  <div className="flex w-full items-start justify-between gap-1">
                    <span
                      className={`font-black leading-none text-text-primary ${
                        option.preset === "compact"
                          ? "text-sm"
                          : option.preset === "large"
                            ? "text-xl"
                            : option.preset === "comfortable"
                              ? "text-lg"
                              : "text-base"
                      }`}
                      aria-hidden
                    >
                      Aa
                    </span>
                    {selected ? (
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    ) : busy ? (
                      <Loader2 size={14} className="shrink-0 animate-spin text-text-muted" />
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-bold text-text-primary">{option.label}</p>
                    <p className="text-[11px] text-text-muted">{Math.round(option.scale * 100)}%</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-text-muted">
            {activeOption.description}. ההעדפה נשמרת לחשבון שלך בלבד.
          </p>
        </div>
      )}
    </section>
  );
}
