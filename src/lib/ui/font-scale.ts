export type FontScalePreset = "compact" | "default" | "comfortable" | "large" | "extra-large";

export interface FontScaleOption {
  preset: FontScalePreset;
  label: string;
  description: string;
  scale: number;
}

export const FONT_SCALE_STORAGE_KEY = "app-font-scale";
export const FONT_SCALE_PRESET_STORAGE_KEY = "app-font-scale-preset";

export const fontScaleOptions: FontScaleOption[] = [
  {
    preset: "compact",
    label: "קטן",
    description: "יותר תוכן על המסך",
    scale: 0.9,
  },
  {
    preset: "default",
    label: "רגיל",
    description: "ברירת המחדל של המערכת",
    scale: 1,
  },
  {
    preset: "comfortable",
    label: "נוח",
    description: "קריאה נוחה יותר",
    scale: 1.12,
  },
  {
    preset: "large",
    label: "גדול",
    description: "טקסט בולט וברור",
    scale: 1.25,
  },
  {
    preset: "extra-large",
    label: "גדול מאוד",
    description: "נגישות מרבית וקריאה קלה",
    scale: 1.4,
  },
];

const presetSet = new Set(fontScaleOptions.map((option) => option.preset));

export function normalizeFontScalePreset(value?: string | null): FontScalePreset {
  if (value && presetSet.has(value as FontScalePreset)) {
    return value as FontScalePreset;
  }
  return "default";
}

export function getFontScaleOption(preset: FontScalePreset): FontScaleOption {
  return fontScaleOptions.find((option) => option.preset === preset) ?? fontScaleOptions[1];
}

export function applyFontScaleToDocument(preset: FontScalePreset): void {
  if (typeof document === "undefined") return;
  const option = getFontScaleOption(preset);
  const root = document.documentElement;
  root.style.setProperty("--app-font-scale", String(option.scale));
  root.style.fontSize = `${16 * option.scale}px`;
  root.dataset.fontScale = preset;
  window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(option.scale));
  window.localStorage.setItem(FONT_SCALE_PRESET_STORAGE_KEY, preset);
}

export function readCachedFontScalePreset(): FontScalePreset | null {
  if (typeof window === "undefined") return null;
  const cached = window.localStorage.getItem(FONT_SCALE_PRESET_STORAGE_KEY);
  if (!cached || !presetSet.has(cached as FontScalePreset)) return null;
  return cached as FontScalePreset;
}
