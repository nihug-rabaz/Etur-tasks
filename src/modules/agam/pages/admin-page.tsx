"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { CANDIDATE_EXPORT_FIELDS, downloadCsv, rowsToCsv } from "@/modules/agam/lib/csv";
import { CONDITION_OPERATORS, FIELD_TYPES } from "@/modules/agam/lib/questions";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type {
  AgamCandidate,
  AgamConditionOperator,
  AgamCriterion,
  AgamFieldType,
  AgamOrgSettings,
  AgamQuestion,
} from "@/modules/agam/types";

type Tab = "pre" | "interview" | "criteria" | "settings" | "export";

export function AgamAdminPage() {
  const [tab, setTab] = useState<Tab>("pre");
  const [questions, setQuestions] = useState<AgamQuestion[]>([]);
  const [criteria, setCriteria] = useState<AgamCriterion[]>([]);
  const [settings, setSettings] = useState<AgamOrgSettings | null>(null);
  const [candidates, setCandidates] = useState<AgamCandidate[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try {
      const [questionsData, criteriaData, settingsData, candidatesData] = await Promise.all([
        agamFetch<{ questions: AgamQuestion[] }>("/api/agam/questions"),
        agamFetch<{ criteria: AgamCriterion[] }>("/api/agam/criteria"),
        agamFetch<{ settings: AgamOrgSettings | null }>("/api/agam/settings"),
        agamFetch<{ candidates: AgamCandidate[] }>("/api/agam/candidates"),
      ]);
      setQuestions(questionsData.questions);
      setCriteria(criteriaData.criteria);
      setSettings(settingsData.settings);
      setCandidates(candidatesData.candidates);
    } catch {
      toast.error("טעינת ניהול נכשלה");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (!loaded) return <p className="p-6 text-sm text-text-muted">טוען…</p>;

  const tabs: Array<[Tab, string]> = [
    ["pre", "שאלון מקדים"],
    ["interview", "שאלות ראיון"],
    ["criteria", "קריטריונים"],
    ["settings", "הגדרות"],
    ["export", "ייצוא"],
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-3xl font-extrabold text-text-primary">פאנל ניהול</h1>
        <p className="mt-1 text-sm text-text-secondary">שאלון, קריטריונים, הגדרות וייצוא</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? primaryButtonClass : secondaryButtonClass}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "pre" ? (
        <QuestionsTab
          type="pre_screening"
          questions={questions.filter((row) => row.question_type === "pre_screening")}
          onChanged={() => void load()}
        />
      ) : null}
      {tab === "interview" ? (
        <QuestionsTab
          type="interview"
          questions={questions.filter((row) => row.question_type === "interview")}
          onChanged={() => void load()}
        />
      ) : null}
      {tab === "criteria" ? <CriteriaTab criteria={criteria} onChanged={() => void load()} /> : null}
      {tab === "settings" ? <SettingsTab org={settings} onChanged={() => void load()} /> : null}
      {tab === "export" ? <ExportTab candidates={candidates} /> : null}
    </div>
  );
}

type QuestionDraft = {
  id?: string;
  section_number: number;
  section_name: string;
  question_text: string;
  field_key: string;
  field_type: AgamFieldType;
  options: string;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  condition_field: string;
  condition_operator: AgamConditionOperator;
  condition_value: string;
};

function emptyQuestionDraft(sortOrder: number): QuestionDraft {
  return {
    section_number: 1,
    section_name: "",
    question_text: "",
    field_key: "",
    field_type: "text",
    options: "",
    is_required: true,
    sort_order: sortOrder,
    is_active: true,
    condition_field: "",
    condition_operator: "eq",
    condition_value: "",
  };
}

function questionToDraft(question: AgamQuestion): QuestionDraft {
  return {
    id: question.id,
    section_number: question.section_number,
    section_name: question.section_name ?? "",
    question_text: question.question_text,
    field_key: question.field_key,
    field_type: question.field_type,
    options: question.options ?? "",
    is_required: question.is_required,
    sort_order: question.sort_order,
    is_active: question.is_active,
    condition_field: question.condition_field ?? "",
    condition_operator: question.condition_operator ?? "eq",
    condition_value: question.condition_value ?? "",
  };
}

function QuestionsTab({
  type,
  questions,
  onChanged,
}: {
  type: "pre_screening" | "interview";
  questions: AgamQuestion[];
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<QuestionDraft>(emptyQuestionDraft(questions.length + 1));
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = async (payload: QuestionDraft) => {
    await agamFetch("/api/agam/questions", {
      method: "POST",
      body: JSON.stringify({
        id: payload.id,
        question_type: type,
        section_number: payload.section_number,
        section_name: payload.section_name || null,
        question_text: payload.question_text,
        field_key: payload.field_key,
        field_type: payload.field_type,
        options: payload.field_type === "select" ? payload.options || "[]" : payload.options || null,
        is_required: payload.is_required,
        condition_field: payload.condition_field || null,
        condition_operator: payload.condition_field ? payload.condition_operator : null,
        condition_value: payload.condition_field ? payload.condition_value : null,
        sort_order: payload.sort_order,
        is_active: payload.is_active,
      }),
    });
  };

  return (
    <div className="space-y-4">
      <QuestionEditor
        draft={draft}
        submitLabel={draft.id ? "שמירת עריכה" : "הוספת שאלה"}
        onChange={setDraft}
        onSubmit={async () => {
          await save(draft);
          toast.success(draft.id ? "השאלה עודכנה" : "השאלה נוספה");
          setDraft(emptyQuestionDraft(questions.length + 2));
          setEditingId(null);
          onChanged();
        }}
      />
      <div className="dashboard-glass divide-y divide-black/8 rounded-3xl p-4 dark:divide-white/10">
        {questions.map((question) => (
          <div key={question.id} className="space-y-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">{question.question_text}</p>
                <p className="text-xs text-text-muted" dir="ltr">
                  {question.field_key} · {question.field_type} · section {question.section_number}
                  {question.is_required ? " · required" : ""}
                  {question.condition_field ? ` · if ${question.condition_field}` : ""}
                  {question.is_active ? "" : " · inactive"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs font-bold text-accent-primary"
                  onClick={() => {
                    setEditingId(question.id);
                    setDraft(questionToDraft(question));
                  }}
                >
                  עריכה
                </button>
                <button
                  type="button"
                  className="text-xs font-bold text-rose-600"
                  onClick={async () => {
                    await agamFetch(`/api/agam/questions?id=${question.id}`, { method: "DELETE" });
                    onChanged();
                  }}
                >
                  מחיקה
                </button>
              </div>
            </div>
            {editingId === question.id ? (
              <QuestionEditor
                draft={draft}
                submitLabel="שמירה"
                onChange={setDraft}
                onSubmit={async () => {
                  await save(draft);
                  toast.success("השאלה עודכנה");
                  setEditingId(null);
                  setDraft(emptyQuestionDraft(questions.length + 1));
                  onChanged();
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionEditor({
  draft,
  submitLabel,
  onChange,
  onSubmit,
}: {
  draft: QuestionDraft;
  submitLabel: string;
  onChange: (draft: QuestionDraft) => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <div className="dashboard-glass grid gap-3 rounded-3xl p-4 sm:grid-cols-2">
      <input
        className={`${fieldClass} sm:col-span-2`}
        placeholder="טקסט שאלה"
        value={draft.question_text}
        onChange={(event) => onChange({ ...draft, question_text: event.target.value })}
      />
      <input
        className={`${fieldClass} text-left`}
        dir="ltr"
        placeholder="field_key"
        value={draft.field_key}
        onChange={(event) => onChange({ ...draft, field_key: event.target.value })}
      />
      <select
        className={fieldClass}
        value={draft.field_type}
        onChange={(event) => onChange({ ...draft, field_type: event.target.value as AgamFieldType })}
      >
        {FIELD_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      {draft.field_type === "select" ? (
        <input
          className={`${fieldClass} sm:col-span-2 text-left`}
          dir="ltr"
          placeholder='אפשרויות JSON, למשל ["כן","לא"]'
          value={draft.options}
          onChange={(event) => onChange({ ...draft, options: event.target.value })}
        />
      ) : null}
      <input
        className={fieldClass}
        placeholder="שם מקטע"
        value={draft.section_name}
        onChange={(event) => onChange({ ...draft, section_name: event.target.value })}
      />
      <input
        type="number"
        className={fieldClass}
        placeholder="מספר מקטע"
        value={draft.section_number}
        onChange={(event) => onChange({ ...draft, section_number: Number(event.target.value) })}
      />
      <input
        type="number"
        className={fieldClass}
        placeholder="סדר"
        value={draft.sort_order}
        onChange={(event) => onChange({ ...draft, sort_order: Number(event.target.value) })}
      />
      <input
        className={`${fieldClass} text-left`}
        dir="ltr"
        placeholder="condition_field (אופציונלי)"
        value={draft.condition_field}
        onChange={(event) => onChange({ ...draft, condition_field: event.target.value })}
      />
      <select
        className={fieldClass}
        value={draft.condition_operator}
        onChange={(event) =>
          onChange({ ...draft, condition_operator: event.target.value as AgamConditionOperator })
        }
      >
        {CONDITION_OPERATORS.map((operator) => (
          <option key={operator.value} value={operator.value}>
            {operator.label}
          </option>
        ))}
      </select>
      <input
        className={fieldClass}
        placeholder="ערך תנאי"
        value={draft.condition_value}
        onChange={(event) => onChange({ ...draft, condition_value: event.target.value })}
      />
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={draft.is_required}
          onChange={(event) => onChange({ ...draft, is_required: event.target.checked })}
        />
        חובה
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={draft.is_active}
          onChange={(event) => onChange({ ...draft, is_active: event.target.checked })}
        />
        פעיל
      </label>
      <div className="sm:col-span-2">
        <button type="button" className={primaryButtonClass} onClick={() => void onSubmit()}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function CriteriaTab({
  criteria,
  onChanged,
}: {
  criteria: AgamCriterion[];
  onChanged: () => void;
}) {
  const weightSum = criteria.filter((row) => row.is_active).reduce((sum, row) => sum + row.weight, 0);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [bullets, setBullets] = useState("");
  const [weight, setWeight] = useState(20);
  const [editing, setEditing] = useState<AgamCriterion | null>(null);

  const save = async (payload: {
    id?: string;
    name: string;
    key: string;
    bullets: string;
    weight: number;
    sort_order: number;
    is_active: boolean;
  }) => {
    await agamFetch("/api/agam/criteria", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };

  return (
    <div className="space-y-4">
      <div className="dashboard-glass rounded-3xl p-4">
        <p className={weightSum === 100 ? "text-sm text-emerald-700" : "text-sm text-amber-700"}>
          סכום משקלים פעילים: {weightSum}% {weightSum !== 100 ? "(מומלץ 100%)" : ""}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input className={fieldClass} placeholder="שם" value={name} onChange={(event) => setName(event.target.value)} />
          <input
            className={`${fieldClass} text-left`}
            dir="ltr"
            placeholder="key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
          <input
            className={`${fieldClass} sm:col-span-2`}
            placeholder="נקודות מנחות"
            value={bullets}
            onChange={(event) => setBullets(event.target.value)}
          />
          <input
            type="number"
            className={fieldClass}
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value))}
          />
        </div>
        <button
          type="button"
          className={`${primaryButtonClass} mt-3`}
          onClick={async () => {
            await save({
              name,
              key,
              bullets,
              weight,
              sort_order: criteria.length + 1,
              is_active: true,
            });
            setName("");
            setKey("");
            setBullets("");
            toast.success("הקריטריון נוסף");
            onChanged();
          }}
        >
          הוספה
        </button>
      </div>
      <div className="dashboard-glass divide-y divide-black/8 rounded-3xl p-4 dark:divide-white/10">
        {criteria.map((row) => (
          <div key={row.id} className="space-y-3 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">
                  {row.name} ({row.weight}%) {row.is_active ? "" : "· לא פעיל"}
                </p>
                <p className="text-xs text-text-muted" dir="ltr">
                  {row.key}
                </p>
                {row.bullets ? <p className="mt-1 text-xs text-text-secondary">{row.bullets}</p> : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs font-bold text-accent-primary"
                  onClick={() => setEditing(row)}
                >
                  עריכה
                </button>
                <button
                  type="button"
                  className="text-xs font-bold text-rose-600"
                  onClick={async () => {
                    await agamFetch(`/api/agam/criteria?id=${row.id}`, { method: "DELETE" });
                    onChanged();
                  }}
                >
                  מחיקה
                </button>
              </div>
            </div>
            {editing?.id === row.id ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className={fieldClass}
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
                <input
                  className={`${fieldClass} text-left`}
                  dir="ltr"
                  value={editing.key}
                  onChange={(event) => setEditing({ ...editing, key: event.target.value })}
                />
                <input
                  className={`${fieldClass} sm:col-span-2`}
                  value={editing.bullets ?? ""}
                  onChange={(event) => setEditing({ ...editing, bullets: event.target.value })}
                />
                <input
                  type="number"
                  className={fieldClass}
                  value={editing.weight}
                  onChange={(event) => setEditing({ ...editing, weight: Number(event.target.value) })}
                />
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(event) => setEditing({ ...editing, is_active: event.target.checked })}
                  />
                  פעיל
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className={primaryButtonClass}
                    onClick={async () => {
                      await save({
                        id: editing.id,
                        name: editing.name,
                        key: editing.key,
                        bullets: editing.bullets ?? "",
                        weight: editing.weight,
                        sort_order: editing.sort_order,
                        is_active: editing.is_active,
                      });
                      setEditing(null);
                      toast.success("הקריטריון עודכן");
                      onChanged();
                    }}
                  >
                    שמירה
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({
  org,
  onChanged,
}: {
  org: AgamOrgSettings | null;
  onChanged: () => void;
}) {
  const [unitName, setUnitName] = useState(org?.unit_name ?? "מדור אומ״ץ");
  const [logoUrl, setLogoUrl] = useState(org?.logo_url ?? "/logo-mador-omtz.png");

  return (
    <div className="dashboard-glass space-y-4 rounded-3xl p-6">
      <label className="block space-y-2 text-sm font-bold text-text-secondary">
        שם יחידה
        <input className={fieldClass} value={unitName} onChange={(event) => setUnitName(event.target.value)} />
      </label>
      <label className="block space-y-2 text-sm font-bold text-text-secondary">
        כתובת לוגו (URL)
        <input
          className={`${fieldClass} text-left`}
          dir="ltr"
          value={logoUrl}
          onChange={(event) => setLogoUrl(event.target.value)}
        />
      </label>
      <button
        type="button"
        className={primaryButtonClass}
        onClick={async () => {
          await agamFetch("/api/agam/settings", {
            method: "PUT",
            body: JSON.stringify({ unit_name: unitName, logo_url: logoUrl || null }),
          });
          toast.success("ההגדרות נשמרו");
          onChanged();
        }}
      >
        שמירה
      </button>
    </div>
  );
}

function ExportTab({ candidates }: { candidates: AgamCandidate[] }) {
  const [selected, setSelected] = useState<string[]>(CANDIDATE_EXPORT_FIELDS.map((field) => field.key));
  const columns = useMemo(
    () => CANDIDATE_EXPORT_FIELDS.filter((field) => selected.includes(field.key)),
    [selected],
  );

  return (
    <div className="dashboard-glass space-y-4 rounded-3xl p-6">
      <div className="flex flex-wrap gap-2">
        {CANDIDATE_EXPORT_FIELDS.map((field) => (
          <button
            key={field.key}
            type="button"
            className={selected.includes(field.key) ? primaryButtonClass : secondaryButtonClass}
            onClick={() =>
              setSelected((current) =>
                current.includes(field.key)
                  ? current.filter((key) => key !== field.key)
                  : [...current, field.key],
              )
            }
          >
            {field.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={primaryButtonClass}
        onClick={() => {
          const csv = rowsToCsv(
            candidates.map((row) => ({
              full_name: row.full_name,
              personal_number: row.personal_number,
              phone: row.phone,
              status: row.status,
              ramad_notes: row.ramad_notes,
            })),
            columns,
          );
          downloadCsv("candidates.csv", csv);
        }}
      >
        הורדת CSV
      </button>
    </div>
  );
}
