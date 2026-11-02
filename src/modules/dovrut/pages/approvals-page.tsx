"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DovrutApprovalStatus, DovrutConcept } from "@/modules/dovrut/types";
import { APPROVAL_STATUS_LABELS, DOMAIN_LABELS } from "@/modules/dovrut/lib/approval-flows";

const STEPS: Array<{ id: "all" | DovrutApprovalStatus; label: string }> = [
  { id: "all", label: "הכל" },
  { id: "waiting_branch_head", label: "רמ״ח" },
  { id: "waiting_deputy_commander", label: "רמ״ט" },
  { id: "waiting_chief_rabbi", label: "רבצ״ר" },
];

function shortBlurb(text: string | null | undefined, max = 140): string {
  const value = (text ?? "").trim();
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function DovrutApprovalsPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"all" | DovrutApprovalStatus>(
    (searchParams.get("step") as DovrutApprovalStatus) || "all",
  );
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("item"));
  const [code, setCode] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [approvedChief, setApprovedChief] = useState<DovrutConcept[]>([]);

  const loadQueue = useCallback(async () => {
    const query =
      step === "all"
        ? "/api/dovrut/concepts?activeOnly=1"
        : `/api/dovrut/concepts?approvalStatus=${step}`;
    const response = await fetch(query);
    const data = await response.json();
    const rows = Array.isArray(data.concepts) ? (data.concepts as DovrutConcept[]) : [];
    setConcepts(
      step === "all"
        ? rows.filter((row) => row.approval_status && row.approval_status !== "approved")
        : rows,
    );
  }, [step]);

  const loadChiefApproved = useCallback(async () => {
    if (step !== "waiting_chief_rabbi") {
      setApprovedChief([]);
      return;
    }
    const response = await fetch(
      "/api/dovrut/concepts?approvalStatus=approved&activeOnly=1",
    );
    const data = await response.json();
    const rows = Array.isArray(data.concepts) ? (data.concepts as DovrutConcept[]) : [];
    setApprovedChief(
      rows
        .filter(
          (row) =>
            row.requires_chief_rabbi &&
            row.work_status_article === "production" &&
            !row.archived_at,
        )
        .slice(0, 12),
    );
  }, [step]);

  useEffect(() => {
    void loadQueue();
    void loadChiefApproved();
  }, [loadQueue, loadChiefApproved]);

  useEffect(() => {
    const fromStep = searchParams.get("step") as DovrutApprovalStatus | null;
    if (fromStep) setStep(fromStep);
    const fromItem = searchParams.get("item");
    const fromCode = searchParams.get("code");
    if (fromItem) setSelectedId(fromItem);
    if (fromCode) {
      const [conceptId] = fromCode.split(":");
      if (conceptId) setSelectedId(conceptId);
      setCode(fromCode);
    }
  }, [searchParams]);

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
      setSelectedId(data.concept?.id ?? selected.id);
    } finally {
      setBusy(false);
    }
  };

  const approveAll = async () => {
    const queue = concepts.filter(
      (row) => row.approval_status && row.approval_status !== "approved",
    );
    if (queue.length === 0) {
      setError("אין אייטמים לאישור בתור המסונן");
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
      if (failed > 0) {
        setError(`${failed} אישורים נכשלו מתוך ${queue.length}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-0 sm:py-0">
      <div>
        <h1 className="text-xl font-bold text-text-primary">אישורי אייטמים</h1>
        <p className="mt-1 text-sm text-text-muted">תור אחוד לפי רמ״ח, רמ״ט ורבצ״ר</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setStep(item.id);
              setSelectedId(null);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              step === item.id
                ? "bg-accent-primary text-white"
                : "bg-surface-2 text-text-primary"
            }`}
          >
            {item.label}
          </button>
        ))}
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

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <ul className="space-y-2">
          {concepts.map((concept) => (
            <li key={concept.id}>
              <button
                type="button"
                onClick={() => setSelectedId(concept.id)}
                className={`w-full min-w-0 overflow-hidden rounded-xl border px-4 py-3 text-start ${
                  selectedId === concept.id
                    ? "border-accent-primary/40 bg-accent-primary/10 dark:bg-accent-primary/10"
                    : "bg-surface-1 shadow-[var(--shadow-soft)]"
                }`}
              >
                <p className="break-words text-sm font-bold">{concept.name}</p>
                <p className="text-[11px] text-text-muted">
                  {concept.project_name}
                  {concept.approval_status
                    ? ` · ${APPROVAL_STATUS_LABELS[concept.approval_status]}`
                    : ""}
                </p>
                {(concept.interviewees ?? []).length > 0 ? (
                  <p className="mt-1 text-[11px] text-text-secondary">
                    מרואיינים: {(concept.interviewees ?? []).join(", ")}
                  </p>
                ) : null}
                {shortBlurb(concept.details) ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-text-muted">
                    {shortBlurb(concept.details)}
                  </p>
                ) : null}
              </button>
            </li>
          ))}
          {concepts.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">אין אייטמים בתור</p>
          ) : null}
        </ul>

        <div className="dashboard-glass rounded-3xl p-4">
          {selected ? (
            <>
              <h2 className="break-words text-lg font-extrabold text-text-primary">{selected.name}</h2>
              <p className="mt-1 text-sm text-text-muted">
                {selected.project_name}
                {selected.domain ? ` · ${DOMAIN_LABELS[selected.domain]}` : ""}
              </p>
              <p className="mt-2 text-sm font-bold text-accent-primary">
                {selected.approval_status
                  ? APPROVAL_STATUS_LABELS[selected.approval_status]
                  : "אין ציר אישורים"}
              </p>
              {(selected.interviewees ?? []).length > 0 ? (
                <p className="mt-2 text-sm text-text-secondary">
                  <span className="font-bold">מרואיינים: </span>
                  {(selected.interviewees ?? []).join(", ")}
                </p>
              ) : null}
              {selected.details ? (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-text-secondary">
                  {selected.details}
                </p>
              ) : null}
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="הערה (חובה)"
                required
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
            </>
          ) : (
            <p className="py-10 text-center text-sm text-text-muted">בחרו אייטם מהתור</p>
          )}
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex justify-center">
        <button
          type="button"
          disabled={busy || concepts.length === 0}
          onClick={() => void approveAll()}
          className="rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:opacity-40"
        >
          אשר הכול ({concepts.filter((c) => c.approval_status && c.approval_status !== "approved").length})
        </button>
      </div>

      {step === "waiting_chief_rabbi" && approvedChief.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-extrabold">אושרו ברבצ״ר לאחרונה</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {approvedChief.map((item) => (
              <li key={item.id} className="min-w-0">
                <Link
                  href={`/dovrut/items/${item.id}`}
                  className="block min-w-0 overflow-hidden rounded-xl bg-surface-1 shadow-[var(--shadow-soft)] px-4 py-3"
                >
                  <p className="break-words text-sm font-bold">{item.name}</p>
                  <p className="text-[11px] text-text-muted">{item.project_name}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
