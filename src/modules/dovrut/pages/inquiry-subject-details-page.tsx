"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { InquirySubjectForm } from "@/modules/dovrut/components/forms/inquiry-subject-form";
import { dovrutFetch } from "@/modules/dovrut/lib/dovrut-fetch";
import type { DovrutInquirySubject } from "@/modules/dovrut/types";

function Fact({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <p className="text-sm text-text-secondary">
      <span className="font-bold text-text-primary">{label}: </span>
      {value}
    </p>
  );
}

export function DovrutInquirySubjectDetailsPage({ subjectId }: { subjectId: string }) {
  const [subject, setSubject] = useState<DovrutInquirySubject | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await dovrutFetch<{ subject: DovrutInquirySubject }>(
        `/api/dovrut/inquiry-subjects/${subjectId}`,
      );
      setSubject(data.subject);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    }
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async () => {
    if (!window.confirm("למחוק את כרטיס הגורם?")) return;
    try {
      await dovrutFetch(`/api/dovrut/inquiry-subjects/${subjectId}`, { method: "DELETE" });
      window.location.href = "/dovrut/inquiry-subjects";
    } catch (err) {
      setError(err instanceof Error ? err.message : "מחיקה נכשלה");
    }
  };

  if (!subject && !error) return <div className="text-sm text-text-muted">טוען כרטיס…</div>;
  if (!subject) return <p className="text-sm text-rose-600">{error}</p>;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div>
        <Link href="/dovrut/inquiry-subjects" className="text-xs font-bold text-violet-600">
          ← חזרה לגורמי תחקורים
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary">{subject.name}</h1>
            {subject.role_title ? (
              <p className="mt-1 text-sm font-semibold text-violet-700">{subject.role_title}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing((open) => !open)}
              className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold dark:bg-slate-800"
            >
              {editing ? "סגור עריכה" : "ערוך"}
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
            >
              מחק
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">כרטיס רקע</h2>
        <div className="space-y-1.5">
          <Fact label="גיל" value={subject.age} />
          <Fact label="עיר מגורים" value={subject.hometown} />
          <Fact label="מצב משפחתי" value={subject.family_status} />
          <Fact label="שנת גיוס" value={subject.enlistment_year} />
          <Fact label="שנים בתפקיד" value={subject.years_in_role} />
          <Fact label="תפקידים קודמים" value={subject.previous_roles} />
        </div>
        {subject.bio ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{subject.bio}</p>
        ) : (
          <p className="mt-4 text-sm text-text-muted">אין ביוגרפיה עדיין</p>
        )}
        {subject.notes ? (
          <p className="mt-3 text-xs text-text-muted">הערות: {subject.notes}</p>
        ) : null}
      </section>

      {editing ? (
        <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
          <h2 className="mb-3 text-sm font-extrabold">עריכת כרטיס</h2>
          <InquirySubjectForm
            key={subject.updated_at}
            subject={subject}
            submitLabel="שמור כרטיס"
            onSaved={(saved) => {
              setSubject(saved);
              setEditing(false);
            }}
          />
        </section>
      ) : null}
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
