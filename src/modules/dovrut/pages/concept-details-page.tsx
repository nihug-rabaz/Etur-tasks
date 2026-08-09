"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  DovrutActivityLog,
  DovrutApprovalStatus,
  DovrutConcept,
  DovrutWorkStatusArticle,
  DovrutWorkStatusSocial,
} from "@/modules/dovrut/types";
import {
  APPROVAL_STATUS_LABELS,
  DOVRUT_DOMAIN_FLOWS,
  DOMAIN_LABELS,
  WORK_STATUS_ARTICLE_LABELS,
  WORK_STATUS_SOCIAL_LABELS,
} from "@/modules/dovrut/lib/approval-flows";

export function DovrutConceptDetailsPage({ conceptId }: { conceptId: string }) {
  const [concept, setConcept] = useState<DovrutConcept | null>(null);
  const [activity, setActivity] = useState<DovrutActivityLog[]>([]);
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/dovrut/concepts/${conceptId}`);
    const data = await response.json();
    setConcept(data.concept ?? null);
    setActivity(Array.isArray(data.activity) ? data.activity : []);
    setNotes(data.concept?.notes ?? "");
    setLink(data.concept?.link ?? "");
  }, [conceptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveFields = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/dovrut/concepts/${conceptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, link }),
      });
      if (!response.ok) {
        setMessage("שמירה נכשלה");
        return;
      }
      setMessage("נשמר");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const setWorkStatus = async (status: string) => {
    setSaving(true);
    try {
      const body =
        concept?.type === "article_interview"
          ? { work_status_article: status as DovrutWorkStatusArticle }
          : { work_status_social: status as DovrutWorkStatusSocial };
      await fetch(`/api/dovrut/concepts/${conceptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const setApproval = async (status: DovrutApprovalStatus) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/dovrut/concepts/${conceptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_status: status,
          rejection_reason: "",
          rejected_at_step: "",
        }),
      });
      if (!response.ok) {
        setMessage("רק מנהל יכול לשנות סטטוס אישורים ישירות");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const copyApprovalCode = async () => {
    if (!concept?.approval_status || concept.approval_status === "approved") return;
    const code = `${concept.id}:${concept.approval_status}`;
    await navigator.clipboard.writeText(code);
    setMessage("קוד אישור הועתק");
  };

  if (!concept) return <div className="text-sm text-text-muted">טוען קונספט…</div>;

  const workLabels =
    concept.type === "article_interview" ? WORK_STATUS_ARTICLE_LABELS : WORK_STATUS_SOCIAL_LABELS;
  const currentWork =
    concept.type === "article_interview"
      ? concept.work_status_article
      : concept.work_status_social;
  const flow = concept.domain ? DOVRUT_DOMAIN_FLOWS[concept.domain] : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div>
        <Link href="/dovrut/concepts" className="text-xs font-bold text-violet-600">
          ← חזרה לקונספטים
        </Link>
        <h1 className="mt-2 text-xl font-bold text-text-primary">{concept.name}</h1>
        <p className="mt-1 text-sm text-text-muted">
          {concept.project_name}
          {concept.domain ? ` · ${DOMAIN_LABELS[concept.domain]}` : ""}
        </p>
      </div>

      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">סטטוס עבודה</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(workLabels).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={saving}
              onClick={() => void setWorkStatus(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                currentWork === value
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-text-secondary dark:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {concept.type === "article_interview" ? (
        <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold">ציר אישורים</h2>
            <button
              type="button"
              onClick={() => void copyApprovalCode()}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold dark:bg-slate-800"
            >
              העתק קוד אישור
            </button>
          </div>
          <div className="space-y-2">
            {flow.map((step) => (
              <button
                key={step}
                type="button"
                disabled={saving}
                onClick={() => void setApproval(step)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-sm font-semibold ${
                  concept.approval_status === step
                    ? "bg-violet-50 text-violet-800 ring-1 ring-violet-300 dark:bg-violet-950 dark:text-violet-200"
                    : "bg-slate-50 text-text-secondary dark:bg-slate-800"
                }`}
              >
                <span>{APPROVAL_STATUS_LABELS[step]}</span>
                <span className="text-[10px]">{step}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">פרטים</h2>
        <div className="grid gap-2">
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="קישור"
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="הערות"
            className="min-h-24 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveFields()}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            שמור
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">היסטוריה</h2>
        <ul className="space-y-2">
          {activity.map((row) => (
            <li key={row.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
              <p className="font-bold text-text-primary">
                {row.action_type} · {row.user_name}
              </p>
              <p className="text-text-muted">{row.details || row.field_changed}</p>
            </li>
          ))}
          {activity.length === 0 ? (
            <p className="text-sm text-text-muted">אין היסטוריה</p>
          ) : null}
        </ul>
      </section>

      {message ? <p className="text-xs font-semibold text-violet-700">{message}</p> : null}
    </div>
  );
}
