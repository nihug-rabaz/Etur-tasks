"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AgamCandidatesTable } from "@/modules/agam/components/candidates-table";
import { CreateCandidateDrawer } from "@/modules/agam/components/create-drawers";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import type { AgamCandidate } from "@/modules/agam/types";
import { canAdmin, canEvaluate, canRamad } from "@/modules/agam/lib/permissions";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary">
            {archived ? "ארכיון מועמדים" : "מועמדים"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">חיפוש, סינון וניווט מהיר לכל שלבי התהליך</p>
        </div>
        {!archived && canEvaluate(role) ? (
          <CreateCandidateDrawer onCreated={() => void load()} />
        ) : null}
      </div>
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
