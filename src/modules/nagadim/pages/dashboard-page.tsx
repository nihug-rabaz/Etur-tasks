"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GAP_STATUS_LABELS } from "@/modules/nagadim/lib/decisions";
import { pageShellClass, panelClass } from "@/modules/nagadim/lib/ui";
import type { ModuleRole } from "@/shared/modules/types";

type Stats = {
  openGaps: number;
  closedGaps: number;
  permanentlyClosedGaps: number;
  activeCandidates: number;
  positions: number;
};

export function NagadimDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [role, setRole] = useState<ModuleRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nagadim/positions");
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { stats: Stats; role: ModuleRole };
      setStats(data.stats);
      setRole(data.role);
    } catch {
      toast.error("טעינת הדשבורד נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !stats) {
    return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  }

  const cards = [
    { label: "מועמדים באיתור", value: stats.activeCandidates, href: "/nagadim/active" },
    { label: "תקנים", value: stats.positions, href: "/nagadim/positions" },
    {
      label: GAP_STATUS_LABELS.open,
      value: stats.openGaps,
      href: "/nagadim/gaps?status=open",
    },
    {
      label: GAP_STATUS_LABELS.closed,
      value: stats.closedGaps,
      href: "/nagadim/gaps?status=closed",
    },
    {
      label: GAP_STATUS_LABELS.permanently_closed,
      value: stats.permanentlyClosedGaps,
      href: "/nagadim/gaps?status=permanently_closed",
    },
  ];

  return (
    <div className={pageShellClass}>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-4xl">נגדים</h1>
        <p className="mt-1 text-xs font-medium text-text-secondary sm:text-sm">
          איתור ושיבוץ נגדים
          {role ? ` · ${role === "admin" ? "מנהל" : role === "viewer" ? "צופה" : "משתמש"}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`${panelClass} p-3 transition hover:ring-2 hover:ring-accent-primary/25 sm:p-4`}
          >
            <p className="text-xs font-semibold text-text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-text-primary">{card.value}</p>
          </Link>
        ))}
      </div>

      <section className={`${panelClass} p-5`}>
        <h2 className="text-lg font-bold text-text-primary">קיצורי דרך</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/nagadim/active"
            className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white"
          >
            איתור פעיל
          </Link>
          <Link
            href="/nagadim/positions"
            className="rounded-xl bg-surface-2 px-4 py-2 text-sm font-bold text-text-primary"
          >
            תקנים בפער
          </Link>
          <Link
            href="/nagadim/gaps"
            className="rounded-xl bg-surface-2 px-4 py-2 text-sm font-bold text-text-primary"
          >
            פערים
          </Link>
        </div>
      </section>
    </div>
  );
}
