"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, Flag } from "lucide-react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { BAHAD1_CHECKLIST } from "@/modules/agam/lib/bahad1-checklist";
import { canEvaluate } from "@/modules/agam/lib/permissions";
import { panelClass, pageShellClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCandidate, AgamCycle } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

type CyclePayload = {
  cycle: AgamCycle;
  candidates: AgamCandidate[];
  role: ModuleRole;
};

export function AgamBahad1PrepPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [payload, setPayload] = useState<CyclePayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await agamFetch<CyclePayload>(`/api/agam/cycles/${id}`);
      setPayload(data);
    } catch {
      toast.error("טעינת המחזור נכשלה");
      setPayload(null);
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const passed = useMemo(
    () => (payload?.candidates ?? []).filter((row) => !row.archived && row.status === "passed"),
    [payload],
  );

  const toggleItem = async (candidate: AgamCandidate, item: string) => {
    if (!canEvaluate(payload?.role ?? null)) return;
    const next = { ...(candidate.pre_bahad1_checklist ?? {}) };
    next[item] = !next[item];
    setSavingId(candidate.id);
    try {
      await agamFetch(`/api/agam/candidates/${candidate.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pre_bahad1_checklist: next }),
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSavingId(null);
    }
  };

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  if (!payload) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className={`${panelClass} p-8 text-center`}>המחזור לא נמצא.</div>
      </div>
    );
  }

  const canEdit = canEvaluate(payload.role);

  return (
    <div className={pageShellClass}>
      <header className={`${panelClass} p-5 sm:p-6`}>
        <Link
          href={`/agam/cycles/${id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted transition hover:text-text-primary"
        >
          <ChevronLeft size={14} className="rotate-180" />
          חזרה למחזור
        </Link>
        <div className="mt-4 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--agam-orange-soft)] text-text-primary">
            <Flag size={22} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              מחזור · {payload.cycle.name}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-text-primary sm:text-4xl">
              הכנות לבה״ד 1
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              צ׳קליסט למועמדים עם סטטוס «עבר» ({passed.length})
            </p>
          </div>
        </div>
      </header>

      {passed.length === 0 ? (
        <div className={`${panelClass} p-10 text-center text-sm text-text-muted`}>
          אין מועמדים שעברו במחזור זה.
        </div>
      ) : (
        <div className="space-y-4">
          {passed.map((candidate) => {
            const checklist = candidate.pre_bahad1_checklist ?? {};
            const done = BAHAD1_CHECKLIST.filter((item) => checklist[item]).length;
            return (
              <article key={candidate.id} className={`${panelClass} p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/agam/candidates/${candidate.id}`}
                      className="text-lg font-extrabold text-text-primary hover:underline"
                    >
                      {candidate.full_name}
                    </Link>
                    <p className="mt-0.5 text-xs text-text-muted" dir="ltr">
                      {candidate.personal_number}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-text-primary">
                    {done}/{BAHAD1_CHECKLIST.length}
                  </span>
                </div>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {BAHAD1_CHECKLIST.map((item) => {
                    const checked = Boolean(checklist[item]);
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          disabled={!canEdit || savingId === candidate.id}
                          onClick={() => void toggleItem(candidate, item)}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm transition ${
                            checked
                              ? "bg-[color:var(--agam-orange-soft)] font-bold text-text-primary"
                              : "bg-surface-2/70 text-text-secondary hover:bg-surface-2"
                          } disabled:opacity-60`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                              checked
                                ? "border-text-primary bg-text-primary text-white"
                                : "border-black/20 dark:border-white/25"
                            }`}
                          >
                            {checked ? "✓" : ""}
                          </span>
                          {item}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      )}

      <div className="pt-2">
        <Link href={`/agam/cycles/${id}`} className={secondaryButtonClass}>
          חזרה למחזור
        </Link>
      </div>
    </div>
  );
}
