"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import {
  emptyStateClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/malshabim/lib/ui";
import type { MalshabimCandidate } from "@/modules/malshabim/types";
import type { ModuleRole } from "@/shared/modules/types";

function canEditRole(role: ModuleRole | null): boolean {
  return role === "admin" || role === "user";
}

export function MalshabimDraftsPage({
  initialCandidates = [],
  initialRole = null,
}: {
  initialCandidates?: MalshabimCandidate[];
  initialRole?: ModuleRole | null;
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [role, setRole] = useState<ModuleRole | null>(initialRole);
  const [loading, setLoading] = useState(!initialRole);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canEdit = canEditRole(role);

  const drafts = useMemo(
    () => candidates.filter((candidate) => candidate.is_draft),
    [candidates],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await malshabimFetch<{
        candidates: MalshabimCandidate[];
        role: ModuleRole;
      }>("/api/malshabim/candidates");
      setCandidates(Array.isArray(res.candidates) ? res.candidates : []);
      setRole(res.role);
    } catch {
      toast.error("טעינת הטיוטות נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialRole) void load();
  }, [initialRole, load]);

  const deleteDraft = async (id: string) => {
    if (!canEdit) return;
    if (!window.confirm("למחוק את הראיון שלא הושלם?")) return;
    setDeletingId(id);
    try {
      await malshabimFetch(`/api/malshabim/candidates/${id}`, { method: "DELETE" });
      setCandidates((list) => list.filter((row) => row.id !== id));
      toast.success("נמחק");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקה נכשלה");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className={pageShellClass} dir="rtl">
      <div className="rounded-3xl border border-border-weak bg-surface-1 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <Link href="/malshabim" className={secondaryButtonClass} aria-label="חזרה">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Link>
          <div>
            <h1 className={`${pageTitleClass} inline-flex items-center gap-2`}>
              <FileText className="h-6 w-6 text-accent-primary" />
              ראיונות שלא הושלמו
            </h1>
            <p className={pageSubtitleClass}>
              טיוטות ראיון שמורות · {drafts.length} ברשימה
            </p>
          </div>
        </div>
      </div>

      {drafts.length === 0 ? (
        <p className={emptyStateClass}>אין ראיונות שלא הושלמו</p>
      ) : (
        <ul className="divide-y divide-border-weak overflow-hidden rounded-3xl border border-border-weak bg-surface-1 shadow-sm">
          {drafts.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
            >
              <div className="min-w-0">
                <p className="font-bold text-text-primary">{c.full_name || "ללא שם"}</p>
                <p className="text-xs font-medium text-text-muted">
                  שלב {(c.draft_step ?? 0) + 1} · {c.phone || "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canEdit ? (
                  <>
                    <Link
                      href={`/malshabim/interview?id=${c.id}`}
                      className={primaryButtonClass}
                    >
                      <Pencil className="h-4 w-4" /> מילוי
                    </Link>
                    <button
                      type="button"
                      className={`${secondaryButtonClass} !text-rose-600`}
                      disabled={deletingId === c.id}
                      onClick={() => void deleteDraft(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === c.id ? "מוחק…" : "מחיקה"}
                    </button>
                  </>
                ) : (
                  <Link
                    href={`/malshabim/interview?id=${c.id}`}
                    className={secondaryButtonClass}
                  >
                    צפייה
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
