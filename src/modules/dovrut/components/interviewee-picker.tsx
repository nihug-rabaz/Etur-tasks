"use client";

import { useMemo, useState } from "react";
import type { DovrutInquirySubject } from "@/modules/dovrut/types";

export function IntervieweePicker({
  subjects,
  values,
  onChange,
  label = "מרואיינים",
}: {
  subjects: DovrutInquirySubject[];
  values: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = subjects.filter((subject) => !values.includes(subject.name));
    if (!q) return available.slice(0, 12);
    return available
      .filter((subject) => {
        const hay = [
          subject.name,
          subject.rank ?? "",
          subject.role_title ?? "",
          subject.hometown ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [subjects, values, query]);

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setQuery("");
  };

  const remove = (name: string) => {
    onChange(values.filter((item) => item !== name));
  };

  return (
    <fieldset className="rounded-xl bg-surface-2/50 p-3 sm:col-span-2">
      <legend className="mb-2 text-xs font-bold text-text-secondary">{label}</legend>
      <p className="mb-2 text-[11px] text-text-muted">
        חיפוש מתוך גורמי תחקור — בחרו להוספה לאייטם
      </p>
      {values.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-2">
          {values.map((name) => (
            <li
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary/15 px-2.5 py-1 text-xs font-bold text-accent-primary"
            >
              <span>{name}</span>
              <button
                type="button"
                aria-label={`הסר ${name}`}
                onClick={() => remove(name)}
                className="rounded-full px-1 text-accent-primary/80 hover:bg-accent-primary/20"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-[11px] text-text-muted">עדיין לא נבחרו מרואיינים</p>
      )}
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="חיפוש לפי שם / דרגה / תפקיד…"
        className="w-full rounded-xl bg-surface-1 px-3 py-2 text-sm outline-none ring-1 ring-black/5"
      />
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {filtered.map((subject) => (
          <li key={subject.id}>
            <button
              type="button"
              onClick={() => add(subject.name)}
              className="flex w-full items-start justify-between gap-2 rounded-xl bg-surface-1 px-3 py-2 text-start text-sm transition hover:bg-accent-primary/10"
            >
              <span className="min-w-0">
                <span className="block font-bold text-text-primary">{subject.name}</span>
                <span className="block text-[11px] text-text-muted">
                  {[subject.rank, subject.role_title].filter(Boolean).join(" · ") ||
                    "גורם תחקור"}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-accent-primary">הוסף</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="px-1 py-3 text-center text-xs text-text-muted">
            {query.trim()
              ? "לא נמצאו תוצאות — בדקו את הרשימה בגורמי תחקור"
              : subjects.length === 0
                ? "אין גורמי תחקור במערכת"
                : "הקלידו לחיפוש או שכל הגורמים כבר נוספו"}
          </li>
        ) : null}
      </ul>
    </fieldset>
  );
}
