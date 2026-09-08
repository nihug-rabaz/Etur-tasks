"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { isGapStatus } from "@/modules/nagadim/lib/decisions";
import { NagadimPositionsPage } from "@/modules/nagadim/pages/positions-page";
import type { NagadimGapStatus } from "@/modules/nagadim/types";

export function NagadimGapsPage() {
  const searchParams = useSearchParams();
  const initial = useMemo(() => {
    const raw = searchParams.get("status");
    return raw && isGapStatus(raw) ? (raw as NagadimGapStatus) : "all";
  }, [searchParams]);

  return (
    <NagadimPositionsPage
      title="פערים"
      initialGapStatus={initial}
      showStatusFilter
    />
  );
}
