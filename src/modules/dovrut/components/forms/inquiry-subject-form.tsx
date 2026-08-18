"use client";

import { useState } from "react";
import { dovrutFetch, emitDovrutMutated } from "@/modules/dovrut/lib/dovrut-fetch";
import type { DovrutInquirySubject } from "@/modules/dovrut/types";

type InquiryDraft = {
  name: string;
  age: string;
  hometown: string;
  family_status: string;
  enlistment_year: string;
  years_in_role: string;
  role_title: string;
  previous_roles: string;
  bio: string;
  notes: string;
};

function emptyDraft(): InquiryDraft {
  return {
    name: "",
    age: "",
    hometown: "",
    family_status: "",
    enlistment_year: "",
    years_in_role: "",
    role_title: "",
    previous_roles: "",
    bio: "",
    notes: "",
  };
}

function fromSubject(subject: DovrutInquirySubject): InquiryDraft {
  return {
    name: subject.name,
    age: subject.age != null ? String(subject.age) : "",
    hometown: subject.hometown ?? "",
    family_status: subject.family_status ?? "",
    enlistment_year: subject.enlistment_year != null ? String(subject.enlistment_year) : "",
    years_in_role: subject.years_in_role != null ? String(subject.years_in_role) : "",
    role_title: subject.role_title ?? "",
    previous_roles: subject.previous_roles ?? "",
    bio: subject.bio ?? "",
    notes: subject.notes ?? "",
  };
}

function toPayload(draft: InquiryDraft) {
  return {
    name: draft.name.trim(),
    age: draft.age.trim() ? Number(draft.age) : null,
    hometown: draft.hometown.trim() || null,
    family_status: draft.family_status.trim() || null,
    enlistment_year: draft.enlistment_year.trim() ? Number(draft.enlistment_year) : null,
    years_in_role: draft.years_in_role.trim() ? Number(draft.years_in_role) : null,
    role_title: draft.role_title.trim() || null,
    previous_roles: draft.previous_roles.trim() || null,
    bio: draft.bio.trim(),
    notes: draft.notes.trim() || null,
  };
}

const FIELD_CLASS =
  "w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800";

export function InquirySubjectForm({
  subject,
  submitLabel,
  onSaved,
}: {
  subject?: DovrutInquirySubject;
  submitLabel: string;
  onSaved?: (saved: DovrutInquirySubject) => void;
}) {
  const [draft, setDraft] = useState<InquiryDraft>(
    subject ? fromSubject(subject) : emptyDraft(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = (key: keyof InquiryDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = toPayload(draft);
      const data = subject
        ? await dovrutFetch<{ subject: DovrutInquirySubject }>(
            `/api/dovrut/inquiry-subjects/${subject.id}`,
            { method: "PUT", body: JSON.stringify(payload) },
          )
        : await dovrutFetch<{ subject: DovrutInquirySubject }>("/api/dovrut/inquiry-subjects", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      if (!subject) setDraft(emptyDraft());
      emitDovrutMutated();
      onSaved?.(data.subject);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input
        value={draft.name}
        onChange={(event) => setField("name", event.target.value)}
        placeholder="שם מלא"
        className={`${FIELD_CLASS} sm:col-span-2`}
      />
      <input
        value={draft.age}
        onChange={(event) => setField("age", event.target.value)}
        placeholder="גיל"
        inputMode="numeric"
        className={FIELD_CLASS}
      />
      <input
        value={draft.hometown}
        onChange={(event) => setField("hometown", event.target.value)}
        placeholder="עיר מגורים / עיר מוצא"
        className={FIELD_CLASS}
      />
      <input
        value={draft.family_status}
        onChange={(event) => setField("family_status", event.target.value)}
        placeholder="מצב משפחתי (נשוי + ילדים וכו׳)"
        className={FIELD_CLASS}
      />
      <input
        value={draft.enlistment_year}
        onChange={(event) => setField("enlistment_year", event.target.value)}
        placeholder="שנת גיוס"
        inputMode="numeric"
        className={FIELD_CLASS}
      />
      <input
        value={draft.years_in_role}
        onChange={(event) => setField("years_in_role", event.target.value)}
        placeholder="שנים בתפקיד"
        inputMode="decimal"
        className={FIELD_CLASS}
      />
      <input
        value={draft.role_title}
        onChange={(event) => setField("role_title", event.target.value)}
        placeholder="תפקיד נוכחי"
        className={`${FIELD_CLASS} sm:col-span-2`}
      />
      <textarea
        value={draft.previous_roles}
        onChange={(event) => setField("previous_roles", event.target.value)}
        placeholder="תפקידים קודמים"
        className={`min-h-20 ${FIELD_CLASS} sm:col-span-2`}
      />
      <textarea
        value={draft.bio}
        onChange={(event) => setField("bio", event.target.value)}
        placeholder="ביוגרפיה חופשית — רקע, שירות, סיפור אישי"
        className={`min-h-32 ${FIELD_CLASS} sm:col-span-2`}
      />
      <textarea
        value={draft.notes}
        onChange={(event) => setField("notes", event.target.value)}
        placeholder="הערות פנימיות"
        className={`min-h-16 ${FIELD_CLASS} sm:col-span-2`}
      />
      {error ? <p className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
      <button
        type="button"
        disabled={saving || !draft.name.trim()}
        onClick={() => void submit()}
        className="w-fit rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
      >
        {saving ? "שומר…" : submitLabel}
      </button>
    </div>
  );
}
