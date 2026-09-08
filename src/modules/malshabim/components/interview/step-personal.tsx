"use client";

import { RECRUITMENT_TRACKS, REQUEST_TYPES, STATUS_TYPES } from "@/modules/malshabim/lib/question-bank";
import { validateIsraeliId } from "@/modules/malshabim/lib/israeli-id";
import { fieldClass } from "@/modules/malshabim/lib/ui";
import type { InterviewFormData } from "@/modules/malshabim/components/interview/types";

export function StepPersonal({
  data,
  onChange,
}: {
  data: InterviewFormData;
  onChange: (next: InterviewFormData) => void;
}) {
  const idTouched = Boolean(data.id_number && data.id_number.length > 0);
  const idValid = !idTouched || validateIsraeliId(data.id_number);
  const set = <K extends keyof InterviewFormData>(key: K, value: InterviewFormData[K]) =>
    onChange({ ...data, [key]: value });

  const toDatetimeLocal = (value?: string | null) =>
    value ? String(value).slice(0, 16) : "";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-bold text-text-primary">
          שם מלא <span className="text-rose-600">*</span>
          <input
            className={fieldClass}
            value={data.full_name || ""}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="שם מלא"
          />
        </label>
        <label className="space-y-1.5 text-sm font-bold text-text-primary">
          מספר פלאפון <span className="text-rose-600">*</span>
          <input
            className={fieldClass}
            value={data.phone || ""}
            onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
            placeholder="05XXXXXXXX"
            inputMode="numeric"
            maxLength={15}
          />
        </label>
        <label className="space-y-1.5 text-sm font-bold text-text-primary">
          תעודת זהות
          <input
            className={`${fieldClass} ${idTouched && !idValid ? "ring-2 ring-rose-500" : ""}`}
            value={data.id_number || ""}
            onChange={(e) => set("id_number", e.target.value.replace(/\D/g, ""))}
            placeholder="9 ספרות"
            inputMode="numeric"
            maxLength={9}
          />
          {idTouched && !idValid ? (
            <span className="text-xs font-medium text-rose-600">תעודת זהות לא תקינה</span>
          ) : null}
        </label>
        <label className="space-y-1.5 text-sm font-bold text-text-primary">
          מספר אישי (מ.א)
          <input
            className={fieldClass}
            value={data.personal_number || ""}
            onChange={(e) => set("personal_number", e.target.value)}
            placeholder="מ.א"
          />
        </label>
        <label className="space-y-1.5 text-sm font-bold text-text-primary">
          מקום מגורים
          <input
            className={fieldClass}
            value={data.city || ""}
            onChange={(e) => set("city", e.target.value)}
            placeholder="עיר / יישוב"
          />
        </label>
        <label className="space-y-1.5 text-sm font-bold text-text-primary">
          תאריך גיוס
          <input
            type="date"
            className={fieldClass}
            value={data.enlistment_date || ""}
            onChange={(e) => set("enlistment_date", e.target.value || null)}
          />
        </label>
      </div>
      <p className="text-xs text-text-muted">* יש למלא ת.ז או מ.א — לפחות אחד מהם</p>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1.5 text-sm font-bold text-text-primary">
          מסלול גיוס
          <select
            className={fieldClass}
            value={data.recruitment_track || ""}
            onChange={(e) => set("recruitment_track", e.target.value || null)}
          >
            <option value="">בחר מסלול</option>
            {RECRUITMENT_TRACKS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-bold text-text-primary">
          סטטוס
          <select
            className={fieldClass}
            value={data.status_type || ""}
            onChange={(e) => set("status_type", e.target.value || null)}
          >
            <option value="">בחר</option>
            {STATUS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-bold text-text-primary">
          איתור / בקשה
          <select
            className={fieldClass}
            value={data.request_type || ""}
            onChange={(e) => set("request_type", e.target.value || null)}
          >
            <option value="">בחר (רשות)</option>
            {REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-bold text-text-primary">
          מועד ראיון קרוב
          <input
            type="datetime-local"
            className={fieldClass}
            value={toDatetimeLocal(data.interview_at)}
            onChange={(e) => set("interview_at", e.target.value || null)}
          />
        </label>
        <label className="space-y-1.5 text-sm font-bold text-text-primary md:col-span-2">
          תזכורת לעדכון סטטוס
          <input
            type="datetime-local"
            className={fieldClass}
            value={toDatetimeLocal(data.next_status_update_at)}
            onChange={(e) => set("next_status_update_at", e.target.value || null)}
          />
        </label>
      </div>
    </div>
  );
}
