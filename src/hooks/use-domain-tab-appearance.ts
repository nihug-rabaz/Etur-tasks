"use client";

import { useEffect, useState } from "react";
import {
  defaultDomainTabAppearance,
  type DomainTabAppearanceMap,
} from "@/lib/ui/domain-tab-appearance";

let cachedAppearance: DomainTabAppearanceMap | null = null;
let inflight: Promise<DomainTabAppearanceMap> | null = null;

async function fetchAppearance(): Promise<DomainTabAppearanceMap> {
  if (cachedAppearance) return cachedAppearance;
  if (inflight) return inflight;
  inflight = fetch("/api/domain-tabs/appearance")
    .then(async (response) => {
      if (!response.ok) return defaultDomainTabAppearance();
      const data = (await response.json()) as { appearance?: DomainTabAppearanceMap };
      const next = data.appearance ?? defaultDomainTabAppearance();
      cachedAppearance = next;
      return next;
    })
    .catch(() => defaultDomainTabAppearance())
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateDomainTabAppearanceCache() {
  cachedAppearance = null;
}

export function useDomainTabAppearance() {
  const [appearance, setAppearance] = useState<DomainTabAppearanceMap>(
    cachedAppearance ?? defaultDomainTabAppearance(),
  );

  useEffect(() => {
    let cancelled = false;
    void fetchAppearance().then((next) => {
      if (!cancelled) setAppearance(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return appearance;
}
