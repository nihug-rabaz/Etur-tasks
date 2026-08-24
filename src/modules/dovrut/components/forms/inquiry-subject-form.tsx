"use client";

import { useMemo, useState } from "react";
import { dovrutFetch, emitDovrutMutated } from "@/modules/dovrut/lib/dovrut-fetch";
import {
  ageFromBirthDate,
  DOVRUT_RANKS,
  DOVRUT_ROLE_PRESETS,
  toDateInputValue,
  yearsFromRoleStart,
} from "@/modules/dovrut/lib/inquiry-subjects";
import type { DovrutInquirySubject } from "@/modules/dovrut/types";

type InquiryDraft = {
  name: string;
  rank: string;
  customRank: string;
  birth_date: string;
  hometown: string;
  family_status: string;
  enlistment_year: string;
  role_started_at: string;
  role_title: string;
  previous_roles: string;
  bio: string;
  notes: string;
};

function emptyDraft(): InquiryDraft {
  return {
    name: "",
    rank: "",
    customRank: "",
    birth_date: "",
    hometown: "",
    family_status: "",
    enlistment_year: "",
    role_started_at: "",
    role_title: "",
    previous_roles: "",
    bio: "",
    notes: "",
  };
}

function fromSubject(subject: DovrutInquirySubject): InquiryDraft {
  const rankValue = subject.rank ?? "";
  const isPreset = (DOVRUT_RANKS as readonly string[]).includes(rankValue) && rankValue !== "אחר";
  return {
    name: subject.name,
    rank: isPreset ? rankValue : rankValue ? "אחר" : "",
    customRank: isPreset ? "" : rankValue,
    birth_date: toDateInputValue(subject.birth_date),
    hometown: subject.hometown ?? "",
    family_status: subject.family_status ?? "",
    enlistment_year: subject.enlistment_year != null ? String(subject.enlistment_year) : "",
    role_started_at: toDateInputValue(subject.role_started_at),
    role_title: subject.role_title ?? "",
    previous_roles: subject.previous_roles ?? "",
    bio: subject.bio ?? "",
    notes: subject.notes ?? "",
  };
}

function resolveRank(draft: InquiryDraft): string | null {
  if (draft.rank === "אחר") return draft.customRank.trim() || null;
  return draft.rank.trim() || null;
}

function toPayload(draft: InquiryDraft) {
  const birthDate = draft.birth_date.trim() || null;
  const roleStartedAt = draft.role_started_at.trim() || null;
  return {
    name: draft.name.trim(),
    rank: resolveRank(draft),
    birth_date: birthDate,
    age: ageFromBirthDate(birthDate),
    hometown: draft.hometown.trim() || null,
    family_status: draft.family_status.trim() || null,
    enlistment_year: draft.enlistment_year.trim() ? Number(draft.enlistment_year) : null,
    role_started_at: roleStartedAt,
    years_in_role: yearsFromRoleStart(roleStartedAt),
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

  const computedAge = useMemo(() => ageFromBirthDate(draft.birth_date || null), [draft.birth_date]);
  const computedYears = useMemo(
    () => yearsFromRoleStart(draft.role_started_at || null),
    [draft.role_started_at],
  );

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
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-bold text-text-muted">דרגה</label>
        <select
          value={draft.rank}
          onChange={(event) => setField("rank", event.target.value)}
          className={FIELD_CLASS}
        >
          <option value="">בחרו דרגה</option>
          {DOVRUT_RANKS.map((rank) => (
            <option key={rank} value={rank}>
              {rank}
            </option>
          ))}
        </select>
        {draft.rank === "אחר" ? (
          <input
            value={draft.customRank}
            onChange={(event) => setField("customRank", event.target.value)}
            placeholder="הקלידו דרגה"
            className={`${FIELD_CLASS} mt-2`}
          />
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-bold text-text-muted">תפקיד נוכחי</label>
        <input
          list="dovrut-role-presets"
          value={draft.role_title}
          onChange={(event) => setField("role_title", event.target.value)}
          placeholder="רמ״ט / רמ״ח / רע״ן הלכה…"
          className={FIELD_CLASS}
        />
        <datalist id="dovrut-role-presets">
          {DOVRUT_ROLE_PRESETS.map((role) => (
            <option key={role} value={role} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-text-muted">תאריך לידה</label>
        <input
          type="date"
          value={draft.birth_date}
          onChange={(event) => setField("birth_date", event.target.value)}
          className={FIELD_CLASS}
        />
        <p className="mt-1 text-[11px] font-semibold text-violet-700">
          גיל מחושב: {computedAge != null ? computedAge : "—"}
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-text-muted">תחילת תפקיד</label>
        <input
          type="date"
          value={draft.role_started_at}
          onChange={(event) => setField("role_started_at", event.target.value)}
          className={FIELD_CLASS}
        />
        <p className="mt-1 text-[11px] font-semibold text-violet-700">
          שנים בתפקיד: {computedYears != null ? computedYears : "—"}
        </p>
      </div>
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
