"use client";

import { useEffect } from "react";
import {
  applyFontScaleToDocument,
  normalizeFontScalePreset,
  type FontScalePreset,
} from "@/lib/ui/font-scale";

interface FontScaleRootProps {
  initialPreset: FontScalePreset;
}

export function FontScaleRoot({ initialPreset }: FontScaleRootProps) {
  useEffect(() => {
    let cancelled = false;

    const syncFromServer = async () => {
      try {
        const response = await fetch("/api/ui/font-scale");
        if (!response.ok) return;
        const data = (await response.json()) as { preset?: string };
        if (cancelled) return;
        applyFontScaleToDocument(normalizeFontScalePreset(data.preset));
      } catch {
        if (!cancelled) applyFontScaleToDocument(normalizeFontScalePreset(initialPreset));
      }
    };

    applyFontScaleToDocument(normalizeFontScalePreset(initialPreset));
    void syncFromServer();

    const onFontScaleChanged = (event: Event) => {
      const preset = (event as CustomEvent<{ preset: FontScalePreset }>).detail?.preset;
      if (preset) applyFontScaleToDocument(preset);
    };

    window.addEventListener("app-font-scale-changed", onFontScaleChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("app-font-scale-changed", onFontScaleChanged);
    };
  }, [initialPreset]);

  return null;
}

export function notifyFontScaleChanged(preset: FontScalePreset): void {
  applyFontScaleToDocument(preset);
  window.dispatchEvent(new CustomEvent("app-font-scale-changed", { detail: { preset } }));
}
