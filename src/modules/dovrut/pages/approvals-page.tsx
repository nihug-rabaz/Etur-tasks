"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { DovrutApprovalStatus, DovrutConcept } from "@/modules/dovrut/types";
import { APPROVAL_STATUS_LABELS, DOMAIN_LABELS } from "@/modules/dovrut/lib/approval-flows";

export function DovrutApprovalsPage() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [concept, setConcept] = useState<DovrutConcept | null>(null);
  const [projectName, setProjectName] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadByCode = useCallback(async (rawCode: string) => {
    setError("");
    const [conceptId, step] = rawCode.trim().split(":");
    if (!conceptId) {
      setError("קוד לא תקין");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/dovrut/concepts/${conceptId}/for-approval`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "לא נמצא");
        setConcept(null);
        return;
      }
      if (step && data.concept?.approval_status && step !== data.concept.approval_status) {
        setError("שלב האישור בקוד לא תואם לסטטוס הנוכחי");
      }
      setConcept(data.concept);
      setProjectName(data.project?.name ?? data.concept?.project_name ?? "");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const fromQuery = searchParams.get("code");
    if (!fromQuery) return;
    setCode(fromQuery);
    void loadByCode(fromQuery);
  }, [searchParams, loadByCode]);

  const act = async (action: "approve" | "reject") => {
    if (!concept?.approval_status) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/dovrut/concepts/${concept.id}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          approvalStep: concept.approval_status,
          rejectionReason: action === "reject" ? rejectionReason : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "פעולה נכשלה");
        return;
      }
      setConcept(data.concept);
      setRejectionReason("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-bold text-text-primary">אישור פריטים</h1>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="הדביקו קוד אישור (id:step)"
          className="min-w-0 flex-1 rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none dark:bg-slate-800"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void loadByCode(code)}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"
        >
          טען
        </button>
      </div>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      {concept ? (
        <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
          <h2 className="text-lg font-extrabold text-text-primary">{concept.name}</h2>
          <p className="mt-1 text-sm text-text-muted">
            {projectName}
            {concept.domain ? ` · ${DOMAIN_LABELS[concept.domain]}` : ""}
          </p>
          <p className="mt-2 text-sm font-bold text-violet-700">
            {concept.approval_status
              ? APPROVAL_STATUS_LABELS[concept.approval_status as DovrutApprovalStatus]
              : "אין ציר אישורים"}
          </p>
          {concept.details ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{concept.details}</p>
          ) : null}
          <textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="סיבת דחייה (אם רלוונטי)"
            className="mt-4 min-h-20 w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy || !concept.approval_status || concept.approval_status === "approved"}
              onClick={() => void act("approve")}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              אשר
            </button>
            <button
              type="button"
              disabled={busy || !concept.approval_status || concept.approval_status === "approved"}
              onClick={() => void act("reject")}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              דחה
            </button>
            <Link
              href={`/dovrut/items/${concept.id}`}
              className="ms-auto rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold dark:bg-slate-800"
            >
              לפרטים
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DovrutApprovalQueuePage({
  status,
  title,
}: {
  status: DovrutApprovalStatus;
  title: string;
}) {
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/dovrut/concepts?approvalStatus=${status}`);
    const data = await response.json();
    setConcepts(Array.isArray(data.concepts) ? data.concepts : []);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <h1 className="text-xl font-bold text-text-primary">{title}</h1>
      <p className="text-sm text-text-muted">{APPROVAL_STATUS_LABELS[status]}</p>
      <ul className="space-y-2">
        {concepts.map((concept) => (
          <li key={concept.id}>
            <Link
              href={`/dovrut/approvals?code=${encodeURIComponent(`${concept.id}:${status}`)}`}
              className="block rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
            >
              <p className="text-sm font-bold">{concept.name}</p>
              <p className="text-[11px] text-text-muted">{concept.project_name}</p>
            </Link>
          </li>
        ))}
        {concepts.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">אין פריטים בתור</p>
        ) : null}
      </ul>
    </div>
  );
}
