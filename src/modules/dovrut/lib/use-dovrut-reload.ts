"use client";

import { useEffect } from "react";
import { DOVRUT_MUTATED_EVENT } from "@/modules/dovrut/lib/dovrut-fetch";

export function useDovrutMutatedReload(load: () => void) {
  useEffect(() => {
    const onMutate = () => load();
    window.addEventListener(DOVRUT_MUTATED_EVENT, onMutate);
    return () => window.removeEventListener(DOVRUT_MUTATED_EVENT, onMutate);
  }, [load]);
}
