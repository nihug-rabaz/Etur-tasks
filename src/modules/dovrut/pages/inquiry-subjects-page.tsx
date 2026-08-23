"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { InquirySubjectForm } from "@/modules/dovrut/components/forms/inquiry-subject-form";
import { dovrutFetch } from "@/modules/dovrut/lib/dovrut-fetch";
import { useDovrutMutatedReload } from "@/modules/dovrut/lib/use-dovrut-reload";
import type { DovrutInquirySubject } from "@/modules/dovrut/types";

export function DovrutInquirySubjectsPage() {
  const [subjects, setSubjects] = useState<DovrutInquirySubject[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await dovrutFetch<{ subjects: DovrutInquirySubject[] }>(
        "/api/dovrut/inquiry-subjects",
      );
      setSubjects(data.subjects);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useDovrutMutatedReload(load);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">גורמי תחקורים</h1>
        <p className="mt-1 text-sm text-text-muted">
          כרטיסי רקע לתדרוכים ותחקורים — גיל, ותק, משפחה, שירות וביוגרפיה
        </p>
      </div>
      <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <h2 className="mb-3 text-sm font-extrabold">גורם חדש</h2>
        <InquirySubjectForm submitLabel="צור כרטיס" onSaved={() => void load()} />
      </div>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {subjects.map((subject) => (
          <li key={subject.id}>
            <Link
              href={`/dovrut/inquiry-subjects/${subject.id}`}
              className="block rounded-2xl border border-black/8 bg-white px-4 py-3 transition hover:border-violet-300 dark:border-white/10 dark:bg-[#161922]"
            >
              <p className="text-sm font-extrabold text-text-primary">{subject.name}</p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {[
                  subject.role_title,
                  subject.rank,
                  subject.age != null ? `גיל ${subject.age}` : null,
                  subject.hometown,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {subject.bio ? (
                <p className="mt-2 line-clamp-3 text-xs text-text-secondary">{subject.bio}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {subjects.length === 0 && !error ? (
        <p className="py-6 text-center text-sm text-text-muted">אין גורמי תחקור עדיין</p>
      ) : null}
    </div>
  );
}
