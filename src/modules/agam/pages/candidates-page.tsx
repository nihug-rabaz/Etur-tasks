"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AgamCandidatesTable } from "@/modules/agam/components/candidates-table";
import { CreateCandidateDrawer } from "@/modules/agam/components/create-drawers";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import type { AgamCandidate } from "@/modules/agam/types";
import { canAdmin, canEvaluate, canRamad } from "@/modules/agam/lib/permissions";
import { pageShellClass, panelClass } from "@/modules/agam/lib/ui";
import type { ModuleRole } from "@/shared/modules/types";

export function AgamCandidatesPage({ archived }: { archived: boolean }) {
  const [candidates, setCandidates] = useState<AgamCandidate[]>([]);
  const [role, setRole] = useState<ModuleRole | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await agamFetch<{ candidates: AgamCandidate[]; role: ModuleRole }>(
        `/api/agam/candidates${archived ? "?archived=1" : ""}`,
      );
      setCandidates(data.candidates);
      setRole(data.role);
    } catch {
      toast.error("טעינת המועמדים נכשלה");
    } finally {
      setLoaded(true);
    }
  }, [archived]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) {
    return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  }

  return (
    <div className={pageShellClass}>
      <header className={`${panelClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              קצינים
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-[2.1rem]">
              {archived ? "ארכיון מועמדים" : "מועמדים"}
            </h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              {archived
                ? "מועמדים שהועברו לארכיון"
                : `${candidates.length} מועמדים · חיפוש, סינון ומעבר מהיר לתיק`}
            </p>
          </div>
          {!archived && canEvaluate(role) ? (
            <CreateCandidateDrawer onCreated={() => void load()} />
          ) : null}
        </div>
      </header>

      <AgamCandidatesTable
        candidates={candidates}
        isRamad={canRamad(role)}
        isAdmin={canAdmin(role)}
        showArchived={archived}
        onChanged={() => void load()}
      />
    </div>
  );
}
