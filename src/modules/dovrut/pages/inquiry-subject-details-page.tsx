"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InquirySubjectForm } from "@/modules/dovrut/components/forms/inquiry-subject-form";
import { dovrutFetch, emitDovrutMutated } from "@/modules/dovrut/lib/dovrut-fetch";
import {
  ageFromBirthDate,
  buildInquiryCopyText,
  buildInquiryParagraph,
  toDateInputValue,
  yearsFromRoleStart,
} from "@/modules/dovrut/lib/inquiry-subjects";
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
  const [message, setMessage] = useState("");
  const [paragraph, setParagraph] = useState("");

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

  const displayAge = useMemo(() => {
    if (!subject) return null;
    return subject.birth_date
      ? ageFromBirthDate(toDateInputValue(subject.birth_date))
      : subject.age;
  }, [subject]);

  const displayYears = useMemo(() => {
    if (!subject) return null;
    return subject.role_started_at
      ? yearsFromRoleStart(toDateInputValue(subject.role_started_at))
      : subject.years_in_role;
  }, [subject]);

  const copyAll = async () => {
    if (!subject) return;
    try {
      await navigator.clipboard.writeText(buildInquiryCopyText(subject));
      setMessage("הכרטיס הועתק");
    } catch {
      setMessage("העתקה נכשלה");
    }
  };

  const exportParagraph = async () => {
    if (!subject) return;
    const text = buildInquiryParagraph(subject);
    setParagraph(text);
    try {
      await navigator.clipboard.writeText(text);
      setMessage("הפסקה הועתקה");
    } catch {
      setMessage("הפסקה מוכנה — העתקה נכשלה");
    }
  };

  const remove = async () => {
    if (!window.confirm("למחוק את כרטיס הגורם?")) return;
    try {
      await dovrutFetch(`/api/dovrut/inquiry-subjects/${subjectId}`, { method: "DELETE" });
      emitDovrutMutated();
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
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {subject.role_title ? (
              <h1 className="text-3xl font-extrabold leading-tight text-violet-700 sm:text-4xl">
                {subject.role_title}
              </h1>
            ) : null}
            <p
              className={`font-bold text-text-primary ${
                subject.role_title ? "mt-2 text-lg" : "text-xl"
              }`}
            >
              {subject.name}
            </p>
            {subject.rank ? (
              <p className="mt-1 inline-block rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                {subject.rank}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyAll()}
              className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"
            >
              העתק הכל
            </button>
            <button
              type="button"
              onClick={() => void exportParagraph()}
              className="rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800"
            >
              ייצוא לפסקה
            </button>
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
              className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              מחק כרטיס
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">כרטיס רקע</h2>
        <div className="space-y-1.5">
          <Fact label="דרגה" value={subject.rank} />
          <Fact label="גיל" value={displayAge} />
          <Fact
            label="תאריך לידה"
            value={
              subject.birth_date
                ? new Date(`${toDateInputValue(subject.birth_date)}T00:00:00`).toLocaleDateString(
                    "he-IL",
                  )
                : null
            }
          />
          <Fact label="עיר מגורים" value={subject.hometown} />
          <Fact label="מצב משפחתי" value={subject.family_status} />
          <Fact label="שנת גיוס" value={subject.enlistment_year} />
          <Fact label="שנים בתפקיד" value={displayYears} />
          <Fact
            label="תחילת תפקיד"
            value={
              subject.role_started_at
                ? new Date(
                    `${toDateInputValue(subject.role_started_at)}T00:00:00`,
                  ).toLocaleDateString("he-IL")
                : null
            }
          />
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

      {paragraph ? (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/30">
          <h2 className="mb-2 text-sm font-extrabold">פסקה מיוצאת</h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">{paragraph}</p>
        </section>
      ) : null}

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
              setParagraph("");
            }}
          />
        </section>
      ) : null}
      {message ? <p className="text-xs font-semibold text-violet-700">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
