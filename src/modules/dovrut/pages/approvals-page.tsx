"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DovrutApprovalStatus, DovrutConcept } from "@/modules/dovrut/types";
import { APPROVAL_STATUS_LABELS, DOMAIN_LABELS } from "@/modules/dovrut/lib/approval-flows";

const COLUMNS: Array<{ id: DovrutApprovalStatus; label: string }> = [
  { id: "waiting_branch_head", label: "רמ״ח" },
  { id: "waiting_deputy_commander", label: "רמ״ט" },
  { id: "waiting_chief_rabbi", label: "רבצ״ר" },
];

function shortBlurb(text: string | null | undefined, max = 90): string {
  const value = (text ?? "").trim().replace(/\s+/g, " ");
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function DovrutApprovalsPage() {
  const searchParams = useSearchParams();
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("item"));
  const [code, setCode] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    const response = await fetch("/api/dovrut/concepts?activeOnly=1");
    const data = await response.json();
    const rows = Array.isArray(data.concepts) ? (data.concepts as DovrutConcept[]) : [];
    setConcepts(
      rows.filter((row) => row.approval_status && row.approval_status !== "approved"),
    );
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const fromItem = searchParams.get("item");
    const fromCode = searchParams.get("code");
    if (fromItem) setSelectedId(fromItem);
    if (fromCode) {
      const [conceptId] = fromCode.split(":");
      if (conceptId) setSelectedId(conceptId);
      setCode(fromCode);
    }
  }, [searchParams]);

  const pools = useMemo(() => {
    const map: Record<string, DovrutConcept[]> = {
      waiting_branch_head: [],
      waiting_deputy_commander: [],
      waiting_chief_rabbi: [],
    };
    for (const row of concepts) {
      if (row.approval_status && map[row.approval_status]) {
        map[row.approval_status].push(row);
      }
    }
    return map;
  }, [concepts]);

  const selected = useMemo(
    () => concepts.find((row) => row.id === selectedId) ?? null,
    [concepts, selectedId],
  );

  const loadByCode = async () => {
    const [conceptId] = code.trim().split(":");
    if (!conceptId) {
      setError("קוד לא תקין");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/dovrut/concepts/${conceptId}/for-approval`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "לא נמצא");
        return;
      }
      setSelectedId(data.concept.id);
      setConcepts((current) => {
        if (current.some((row) => row.id === data.concept.id)) return current;
        return [data.concept, ...current];
      });
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: "approve" | "reject") => {
    if (!selected?.approval_status) return;
    if (!notes.trim()) {
      setError("יש להזין הערה");
      return;
    }
    if (action === "reject" && !rejectionReason.trim()) {
      setError("יש להזין סיבת דחייה");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/dovrut/concepts/${selected.id}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          approvalStep: selected.approval_status,
          notes: notes.trim(),
          rejectionReason: action === "reject" ? rejectionReason.trim() : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "פעולה נכשלה");
        return;
      }
      setRejectionReason("");
      setNotes("");
      await loadQueue();
      setSelectedId(null);
    } finally {
      setBusy(false);
    }
  };

  const approveAllInColumn = async (status: DovrutApprovalStatus) => {
    const queue = pools[status] ?? [];
    if (queue.length === 0) {
      setError("אין אייטמים בעמודה זו");
      return;
    }
    if (!notes.trim()) {
      setError("יש להזין הערה משותפת לפני ״אשר הכול״");
      return;
    }
    setBusy(true);
    setError("");
    let failed = 0;
    try {
      for (const row of queue) {
        if (!row.approval_status) continue;
        const response = await fetch(`/api/dovrut/concepts/${row.id}/approval`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            approvalStep: row.approval_status,
            notes: notes.trim(),
          }),
        });
        if (!response.ok) failed += 1;
      }
      setNotes("");
      setRejectionReason("");
      await loadQueue();
      setSelectedId(null);
      if (failed > 0) setError(`${failed} אישורים נכשלו מתוך ${queue.length}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-0 sm:py-0">
      <div>
        <h1 className="text-xl font-bold text-text-primary">אישורי אייטמים</h1>
        <p className="mt-1 text-sm text-text-muted">
          שלוש עמודות — רמ״ח · רמ״ט · רבצ״ר · לחצו על שורה לפרטים ואישור
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="קוד אישור (id:step)"
          className="min-w-0 flex-1 rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void loadByCode()}
          className="shrink-0 rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-40"
        >
          טען
        </button>
      </div>

      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

      <div className="grid gap-3 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const rows = pools[column.id] ?? [];
          return (
            <section
              key={column.id}
              className="dashboard-glass flex min-h-[18rem] flex-col rounded-3xl p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-extrabold text-text-primary">{column.label}</h2>
                <span className="rounded-full bg-accent-primary/12 px-2 py-0.5 text-[11px] font-bold text-accent-primary">
                  {rows.length}
                </span>
              </div>
              <ul className="flex-1 space-y-2 overflow-y-auto">
                {rows.map((concept) => (
                  <li key={concept.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(concept.id)}
                      className={`w-full min-w-0 overflow-hidden rounded-xl border px-3 py-2.5 text-start transition ${
                        selectedId === concept.id
                          ? "border-accent-primary/40 bg-accent-primary/10"
                          : "border-transparent bg-surface-1 shadow-[var(--shadow-soft)] hover:border-accent-primary/20"
                      }`}
                    >
                      <p className="break-words text-sm font-bold">{concept.name}</p>
                      <p className="mt-0.5 text-[11px] text-text-muted">
                        {concept.project_name}
                        {concept.domain ? ` · ${DOMAIN_LABELS[concept.domain]}` : ""}
                      </p>
                      {(concept.interviewees ?? []).length > 0 ? (
                        <p className="mt-1 line-clamp-1 text-[11px] text-text-secondary">
                          {(concept.interviewees ?? []).join(", ")}
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))}
                {rows.length === 0 ? (
                  <p className="py-8 text-center text-xs text-text-muted">אין ממתינים</p>
                ) : null}
              </ul>
              {rows.length > 0 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void approveAllInColumn(column.id)}
                  className="mt-2 rounded-xl bg-emerald-700/90 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                  אשר הכול בעמודה ({rows.length})
                </button>
              ) : null}
            </section>
          );
        })}
      </div>

      {selected ? (
        <div className="dashboard-glass rounded-3xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="break-words text-lg font-extrabold text-text-primary">
                {selected.name}
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                {selected.project_name}
                {selected.domain ? ` · ${DOMAIN_LABELS[selected.domain]}` : ""}
              </p>
              <p className="mt-2 text-sm font-bold text-accent-primary">
                {selected.approval_status
                  ? APPROVAL_STATUS_LABELS[selected.approval_status]
                  : "אין ציר אישורים"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-lg bg-surface-2 px-2.5 py-1 text-[11px] font-bold"
            >
              סגור
            </button>
          </div>
          {(selected.interviewees ?? []).length > 0 ? (
            <p className="mt-2 text-sm text-text-secondary">
              <span className="font-bold">מרואיינים: </span>
              {(selected.interviewees ?? []).join(", ")}
            </p>
          ) : null}
          {shortBlurb(selected.details, 220) ? (
            <p className="mt-3 text-sm text-text-secondary">{shortBlurb(selected.details, 220)}</p>
          ) : null}
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="הערה (חובה)"
            className="mt-4 min-h-20 w-full rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="סיבת דחייה (חובה בדחייה)"
            className="mt-2 min-h-16 w-full rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !selected.approval_status || selected.approval_status === "approved"}
              onClick={() => void act("approve")}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              אשר
            </button>
            <button
              type="button"
              disabled={busy || !selected.approval_status || selected.approval_status === "approved"}
              onClick={() => void act("reject")}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              דחה
            </button>
            <Link
              href={`/dovrut/items/${selected.id}`}
              className="ms-auto rounded-xl bg-surface-2 px-4 py-2 text-sm font-bold"
            >
              לפרטים
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
