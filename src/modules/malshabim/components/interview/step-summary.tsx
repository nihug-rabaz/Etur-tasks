"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Plus, Trash2, XCircle, FastForward } from "lucide-react";
import { BIYENISH_LABEL } from "@/modules/malshabim/lib/question-bank";
import { normalizePersonName } from "@/modules/malshabim/lib/person-name";
import { CANDIDATE_STATUSES } from "@/modules/malshabim/lib/status";
import { fieldClass, secondaryButtonClass } from "@/modules/malshabim/lib/ui";
import type {
  InstructionItem,
  InterviewFormData,
} from "@/modules/malshabim/components/interview/types";
import type { MalshabimInstructionAssignee } from "@/modules/malshabim/types";

const PASS_MIN_CORRECT = 11;
const SKIP_MIN_CORRECT = 4;

type SystemUser = { id: string; name: string; email: string | null };

function selectedAssigneeIds(item: InstructionItem): string[] {
  if (Array.isArray(item.assignees) && item.assignees.length > 0) {
    return [
      ...new Set(
        item.assignees
          .map((a) => (a?.user_id ? String(a.user_id) : ""))
          .filter(Boolean),
      ),
    ];
  }
  if (item.assignee_user_id) return [String(item.assignee_user_id)];
  if (Array.isArray(item.recipients) && item.recipients[0]) {
    return [String(item.recipients[0])];
  }
  return [];
}

function buildAssigneesFromIds(
  ids: string[],
  users: SystemUser[],
  previous: InstructionItem,
): {
  assignees: MalshabimInstructionAssignee[];
  assignee_user_id: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  recipients: string[];
} {
  const assignees: MalshabimInstructionAssignee[] = ids.map((id) => {
    const selected = users.find((user) => user.id === id);
    const prev = previous.assignees?.find((a) => a.user_id === id);
    return {
      user_id: id,
      name: selected?.name ?? prev?.name ?? (previous.assignee_user_id === id ? previous.assignee_name : null) ?? null,
      email:
        selected?.email ??
        prev?.email ??
        (previous.assignee_user_id === id ? previous.assignee_email : null) ??
        null,
    };
  });
  const primary = assignees[0] ?? null;
  return {
    assignees,
    assignee_user_id: primary?.user_id ?? null,
    assignee_name: primary?.name ?? null,
    assignee_email: primary?.email ?? null,
    recipients: assignees.map((a) => a.user_id),
  };
}

export function StepSummary({
  data,
  onChange,
  observanceFailed = false,
}: {
  data: InterviewFormData;
  onChange: (next: InterviewFormData) => void;
  observanceFailed?: boolean;
}) {
  const skipped = !observanceFailed && data.quiz_skipped === true;
  const allQuestions = data.quiz_questions || [];
  const questions = skipped ? allQuestions.slice(0, 5) : allQuestions;
  const correct = observanceFailed ? 0 : questions.filter((q) => q.is_correct).length;
  const total = observanceFailed ? 0 : questions.length || 1;
  const score = observanceFailed
    ? 0
    : Math.round((correct / Math.max(total, 1)) * 100);
  const passed = observanceFailed
    ? false
    : skipped
      ? correct >= SKIP_MIN_CORRECT
      : correct >= PASS_MIN_CORRECT;

  const [users, setUsers] = useState<SystemUser[]>([]);

  useEffect(() => {
    if (data.quiz_score === score && data.quiz_passed === passed) return;
    onChange({ ...data, quiz_score: score, quiz_passed: passed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, passed, observanceFailed]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/malshabim/users-picker?purpose=instructions", {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        const rows = Array.isArray(payload.users) ? payload.users : [];
        setUsers(
          rows
            .map((row: { id?: string; name?: string; email?: string | null }) => ({
              id: String(row.id ?? ""),
              name: normalizePersonName(row.name) || "משתמש",
              email: row.email?.trim() || null,
            }))
            .filter((row: SystemUser) => row.id),
        );
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof InterviewFormData>(key: K, value: InterviewFormData[K]) =>
    onChange({ ...data, [key]: value });

  const items = (Array.isArray(data.instruction_items)
    ? data.instruction_items
    : []) as InstructionItem[];
  const updateItems = (next: InstructionItem[]) =>
    onChange({
      ...data,
      instruction_items: next,
      instruction_recipients: [
        ...new Set(
          next.flatMap((item) => selectedAssigneeIds(item)),
        ),
      ],
    });

  const toggleAssignee = (idx: number, userId: string) => {
    const item = items[idx];
    if (!item) return;
    const current = selectedAssigneeIds(item);
    const nextIds = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    updateItems(
      items.map((it, i) =>
        i === idx ? { ...it, ...buildAssigneesFromIds(nextIds, users, it) } : it,
      ),
    );
  };

  return (
    <div className="space-y-5">
      <div
        className={`flex items-center justify-between rounded-2xl p-5 text-white ${
          observanceFailed || skipped ? "bg-violet-600" : "bg-accent-primary"
        }`}
      >
        <div>
          <p className="text-sm opacity-80">
            {observanceFailed || skipped
              ? "תוצאות המבחן — לא בוצע מבחן ידע"
              : "תוצאת המבחן"}
          </p>
          <p className="text-4xl font-black">{observanceFailed || skipped ? "—" : score}</p>
          <p className="text-sm opacity-80">
            {observanceFailed || skipped
              ? "לא בוצע מבחן ידע"
              : `${correct} מתוך ${total} תשובות נכונות`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {skipped ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold">
              <FastForward className="h-3.5 w-3.5" /> דילוג {BIYENISH_LABEL}
            </span>
          ) : null}
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-white ${
              passed ? "bg-green-600" : "bg-rose-600"
            }`}
          >
            {passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {passed ? "עבר" : "לא עבר"}
          </span>
        </div>
      </div>

      <label className="block space-y-1.5 text-sm font-bold text-text-primary">
        סטטוס
        <select
          className={fieldClass}
          value={data.candidate_status || "בטיפול"}
          onChange={(e) => set("candidate_status", e.target.value)}
        >
          {CANDIDATE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5 text-sm font-bold text-text-primary">
        סיכום הראיון
        <textarea
          className={`${fieldClass} min-h-32`}
          placeholder="כתוב סיכום חופשי של הראיון..."
          value={data.interview_summary || ""}
          onChange={(e) => set("interview_summary", e.target.value)}
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-text-primary">הנחיות לביצוע</p>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() =>
              updateItems([
                ...items,
                {
                  text: "",
                  status: "בטיפול",
                  recipients: [],
                  assignee_user_id: null,
                  assignee_name: null,
                  assignee_email: null,
                  assignees: [],
                  sent_at: null,
                },
              ])
            }
          >
            <Plus className="h-4 w-4" /> הוסף הנחיה
          </button>
        </div>
        {items.length === 0 ? (
          <p className="rounded-xl bg-surface-2/60 px-3 py-3 text-sm text-text-muted">
            אין הנחיות עדיין — הוסף הנחיה חדשה.
          </p>
        ) : null}
        {items.map((item, idx) => {
          const selectedIds = selectedAssigneeIds(item);
          const orphanIds = selectedIds.filter(
            (id) => !users.some((user) => user.id === id),
          );
          return (
            <div key={idx} className="space-y-2 rounded-2xl bg-surface-2/70 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-sm font-bold text-text-muted">{idx + 1}.</span>
                <textarea
                  className={`${fieldClass} min-h-20 flex-1`}
                  placeholder="תוכן ההנחיה..."
                  value={item.text || ""}
                  onChange={(e) =>
                    updateItems(
                      items.map((it, i) =>
                        i === idx ? { ...it, text: e.target.value } : it,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="mt-1 rounded-lg p-2 text-rose-600 hover:bg-rose-500/10"
                  onClick={() => updateItems(items.filter((_, i) => i !== idx))}
                  aria-label="מחק הנחיה"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <fieldset className="mr-6 space-y-1.5">
                <legend className="text-xs font-bold text-text-muted">
                  אחראים לביצוע (ניתן לבחור כמה)
                </legend>
                {users.length === 0 && orphanIds.length === 0 ? (
                  <p className="text-[11px] text-text-muted">
                    אין משתמשים זמינים לשיבוץ הנחיות.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {orphanIds.map((id) => {
                      const orphan =
                        item.assignees?.find((a) => a.user_id === id) ?? null;
                      const label =
                        orphan?.name ||
                        (item.assignee_user_id === id ? item.assignee_name : null) ||
                        "משתמש משויך";
                      return (
                        <li key={id}>
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-accent-primary"
                              checked
                              onChange={() => toggleAssignee(idx, id)}
                            />
                            <span>{label}</span>
                          </label>
                        </li>
                      );
                    })}
                    {users.map((user) => (
                      <li key={user.id}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-accent-primary"
                            checked={selectedIds.includes(user.id)}
                            onChange={() => toggleAssignee(idx, user.id)}
                          />
                          <span>
                            {user.name}
                            {user.email ? (
                              <span className="text-text-muted"> · {user.email}</span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>
              {selectedIds.length > 0 ? (
                <p className="mr-6 text-[11px] text-text-muted">
                  בשמירת הראיון תישלח ההנחיה במייל ובהתראה במערכת לכל אחראי
                  חדש.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
