"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DovrutConcept } from "@/modules/dovrut/types";
import { APPROVAL_STATUS_LABELS, DOMAIN_LABELS } from "@/modules/dovrut/lib/approval-flows";

export function DovrutChiefRabbiDashboardPage() {
  const [waiting, setWaiting] = useState<DovrutConcept[]>([]);
  const [approved, setApproved] = useState<DovrutConcept[]>([]);

  const load = useCallback(async () => {
    const [waitingRes, approvedRes] = await Promise.all([
      fetch("/api/dovrut/concepts?approvalStatus=waiting_chief_rabbi"),
      fetch("/api/dovrut/concepts?approvalStatus=approved"),
    ]);
    const waitingData = await waitingRes.json();
    const approvedData = await approvedRes.json();
    setWaiting(Array.isArray(waitingData.concepts) ? waitingData.concepts : []);
    setApproved(
      (Array.isArray(approvedData.concepts) ? approvedData.concepts : []).filter(
        (item: DovrutConcept) => item.requires_chief_rabbi,
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">דשבורד רבצ״ר · הרב קובי</h1>
        <p className="mt-1 text-sm text-text-muted">תור ממתינים + אייטמים שאושרו ברבצ״ר</p>
      </div>
      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">ממתין לאישור רבצ״ר ({waiting.length})</h2>
        <ul className="space-y-2">
          {waiting.map((item) => (
            <li key={item.id}>
              <Link
                href={`/dovrut/items/${item.id}`}
                className="block rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/40"
              >
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-[11px] text-text-muted">
                  {item.project_name}
                  {item.domain ? ` · ${DOMAIN_LABELS[item.domain]}` : ""}
                  {" · "}
                  {APPROVAL_STATUS_LABELS.waiting_chief_rabbi}
                </p>
              </Link>
            </li>
          ))}
          {waiting.length === 0 ? (
            <p className="text-sm text-text-muted">אין אייטמים ממתינים</p>
          ) : null}
        </ul>
      </section>
      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">אושרו לאחרונה</h2>
        <ul className="space-y-2">
          {approved.slice(0, 15).map((item) => (
            <li key={item.id}>
              <Link
                href={`/dovrut/items/${item.id}`}
                className="block rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800"
              >
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-[11px] text-text-muted">{item.project_name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
