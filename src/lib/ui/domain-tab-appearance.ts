import {
  BriefcaseBusiness,
  Calendar,
  Compass,
  Flag,
  Heart,
  Megaphone,
  Radar,
  Shield,
  Sparkles,
  Star,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { domainKeys, domainMeta, type DomainKey } from "@/lib/ui/domains";

export const domainTabIconRegistry = {
  Radar,
  Megaphone,
  BriefcaseBusiness,
  Target,
  Users,
  Calendar,
  Flag,
  Star,
  Shield,
  Sparkles,
  Heart,
  Compass,
} as const;

export type DomainTabIconName = keyof typeof domainTabIconRegistry;

export const domainTabIconLabels: Record<DomainTabIconName, string> = {
  Radar: "מכ\"ם",
  Megaphone: "מגפון",
  BriefcaseBusiness: "תיק עבודה",
  Target: "מטרה",
  Users: "משתמשים",
  Calendar: "לוח שנה",
  Flag: "דגל",
  Star: "כוכב",
  Shield: "מגן",
  Sparkles: "ניצוצות",
  Heart: "לב",
  Compass: "מצפן",
};

export interface DomainTabAppearanceItem {
  icon: DomainTabIconName;
  imageUrl: string | null;
}

export type DomainTabAppearanceMap = Record<DomainKey, DomainTabAppearanceItem>;

const defaultIcons: Record<DomainKey, DomainTabIconName> = {
  recruitment: "Radar",
  positioning: "Megaphone",
  general: "BriefcaseBusiness",
};

export function defaultDomainTabAppearance(): DomainTabAppearanceMap {
  return Object.fromEntries(
    domainKeys.map((key) => [key, { icon: defaultIcons[key], imageUrl: null }]),
  ) as DomainTabAppearanceMap;
}

export function normalizeDomainTabIconName(value: string | null | undefined): DomainTabIconName {
  if (value && value in domainTabIconRegistry) return value as DomainTabIconName;
  return "BriefcaseBusiness";
}

export function parseDomainTabAppearance(raw: string | null | undefined): DomainTabAppearanceMap {
  const defaults = defaultDomainTabAppearance();
  if (!raw?.trim()) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<DomainKey, Partial<DomainTabAppearanceItem>>>;
    for (const key of domainKeys) {
      const item = parsed[key];
      if (!item) continue;
      defaults[key] = {
        icon: normalizeDomainTabIconName(item.icon),
        imageUrl: typeof item.imageUrl === "string" && item.imageUrl.trim() ? item.imageUrl.trim() : null,
      };
    }
    return defaults;
  } catch {
    return defaults;
  }
}

export function serializeDomainTabAppearance(map: DomainTabAppearanceMap): string {
  return JSON.stringify(map);
}

export function resolveDomainTabIcon(name: string): LucideIcon {
  return domainTabIconRegistry[normalizeDomainTabIconName(name)];
}

export function domainTabLabel(key: DomainKey): string {
  return domainMeta[key].label;
}
