"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  StepPersonal,
  type InterviewerOption,
} from "@/modules/malshabim/components/interview/step-personal";
import { StepObservance } from "@/modules/malshabim/components/interview/step-observance";
import { StepQuiz } from "@/modules/malshabim/components/interview/step-quiz";
import { StepSummary } from "@/modules/malshabim/components/interview/step-summary";
import type { InterviewFormData } from "@/modules/malshabim/components/interview/types";
import { computeChanges } from "@/modules/malshabim/lib/diff-changes";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import {
  OBSERVANCE_QUESTIONS,
  pickRandomQuestions,
} from "@/modules/malshabim/lib/question-bank";
import { validateIsraeliId } from "@/modules/malshabim/lib/israeli-id";
import { normalizeCandidateStatus } from "@/modules/malshabim/lib/status";
import {
  formShellClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/malshabim/lib/ui";
import type { MalshabimCandidate } from "@/modules/malshabim/types";
import type { ModuleRole } from "@/shared/modules/types";

const STEPS = ["פרטים אישיים", "שמירת מצוות", "מבחן ידע", "סיכום והנחיות"];

const OBSERVANCE_FAIL_MESSAGE =
  'החייל אינו עומד בתנאי הסוף של שמירת המצוות. לתקן תשובות, או להמשיך לסיכום לסגירת התיק (דילוג על מבחן ידע)?';

function emptyDraft(): InterviewFormData {
  return {
    full_name: null,
    phone: null,
    id_number: null,
    personal_number: null,
    city: null,
    photo_url: null,
    candidate_status: "ממתין לריאיון",
    advanced_status: "בטיפול",
    status_type: null,
    request_type: null,
    recruitment_track: null,
    enlistment_date: null,
    interview_at: null,
    next_status_update_at: null,
    observance: {},
    quiz_questions: pickRandomQuestions(15),
    quiz_score: null,
    quiz_passed: false,
    quiz_skipped: false,
    interview_summary: null,
    interviewer_notes: null,
    instructions: null,
    instruction_items: [],
    instruction_recipients: [],
    is_draft: true,
    draft_step: 0,
    update_log: [],
    interviewer_user_id: null,
    awaiting_admin_approval: false,
    request_meta: {},
  };
}

function normalizeInstructionItems(
  items: MalshabimCandidate["instruction_items"] | InterviewFormData["instruction_items"],
): InterviewFormData["instruction_items"] {
  return (items || []).map((item) => ({
    ...item,
    text: item.text ?? "",
    status: item.status === "הושלם" ? "הושלם" : "בטיפול",
    recipients: item.recipients ?? [],
    sent_at: item.sent_at ?? null,
  }));
}

function candidateToForm(c: MalshabimCandidate): InterviewFormData {
  return {
    id: c.id,
    full_name: c.full_name,
    phone: c.phone,
    id_number: c.id_number,
    personal_number: c.personal_number,
    city: c.city,
    photo_url: c.photo_url,
    candidate_status: normalizeCandidateStatus(c.candidate_status),
    advanced_status: c.advanced_status || "בטיפול",
    status_type: c.status_type,
    request_type: c.request_type,
    recruitment_track: c.recruitment_track,
    enlistment_date: c.enlistment_date,
    interview_at: c.interview_at,
    next_status_update_at: c.next_status_update_at,
    observance: (c.observance || {}) as InterviewFormData["observance"],
    quiz_questions: (c.quiz_questions || []).map((q) => ({
      question: String(q.question || ""),
      answer: String(q.answer || ""),
      is_correct: Boolean((q as { is_correct?: boolean }).is_correct),
    })),
    quiz_score: c.quiz_score,
    quiz_passed: c.quiz_passed,
    quiz_skipped: c.quiz_skipped,
    interview_summary: c.interview_summary,
    interviewer_notes: c.interviewer_notes,
    instructions: c.instructions,
    instruction_items: normalizeInstructionItems(c.instruction_items),
    instruction_recipients: c.instruction_recipients || [],
    is_draft: c.is_draft,
    draft_step: c.draft_step,
    update_log: c.update_log || [],
    serial_number: c.serial_number,
    interviewer_user_id: c.interviewer_user_id ?? null,
    awaiting_admin_approval: Boolean(c.awaiting_admin_approval),
    request_meta: c.request_meta || {},
  };
}

function toPayload(data: InterviewFormData) {
  return {
    full_name: data.full_name,
    phone: data.phone,
    id_number: data.id_number,
    personal_number: data.personal_number,
    city: data.city,
    photo_url: data.photo_url,
    candidate_status: data.candidate_status,
    advanced_status: data.advanced_status,
    status_type: data.status_type,
    request_type: data.request_type,
    recruitment_track: data.recruitment_track,
    enlistment_date: data.enlistment_date,
    interview_at: data.interview_at,
    next_status_update_at: data.next_status_update_at,
    observance: data.observance,
    quiz_questions: data.quiz_questions,
    quiz_score: data.quiz_score,
    quiz_passed: data.quiz_passed,
    quiz_skipped: data.quiz_skipped,
    interview_summary: data.interview_summary,
    interviewer_notes: data.interviewer_notes,
    instructions: data.instructions,
    instruction_items: data.instruction_items,
    instruction_recipients: data.instruction_recipients,
    is_draft: data.is_draft,
    draft_step: data.draft_step,
    update_log: data.update_log,
    interviewer_user_id: data.interviewer_user_id,
    awaiting_admin_approval: data.awaiting_admin_approval,
    request_meta: data.request_meta || {},
  };
}

function canEditRole(role: ModuleRole | null): boolean {
  return role === "admin" || role === "user";
}

export function MalshabimInterviewPage({
  editId = null,
  canEdit: initialCanEdit = false,
}: {
  editId?: string | null;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<InterviewFormData | null>(null);
  const [original, setOriginal] = useState<InterviewFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(initialCanEdit);
  const [userName, setUserName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showObservanceWarning, setShowObservanceWarning] = useState(false);
  const [observanceFailed, setObservanceFailed] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [interviewers, setInterviewers] = useState<InterviewerOption[]>([]);
  const [duplicateAlert, setDuplicateAlert] = useState<{
    field: string;
    existingName: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const interviewersPromise = malshabimFetch<{ interviewers: InterviewerOption[] }>(
          "/api/malshabim/interviewers",
        ).catch(() => ({ interviewers: [] as InterviewerOption[] }));

        if (editId) {
          const [res, interviewersRes] = await Promise.all([
            malshabimFetch<{
              candidate: MalshabimCandidate;
              role: ModuleRole;
              currentUserName: string;
            }>(`/api/malshabim/candidates/${editId}`),
            interviewersPromise,
          ]);
          setInterviewers(
            (interviewersRes.interviewers || []).map((u) => ({
              id: u.id || (u as { user_id?: string }).user_id || "",
              name: u.name,
            })),
          );
          setCanEdit(canEditRole(res.role));
          setUserName(res.currentUserName || "");
          const form = candidateToForm(res.candidate);
          if (canEditRole(res.role)) {
            const openLog = {
              date: new Date().toISOString(),
              changes: "פתיחת תיק לעריכה",
              updated_by: res.currentUserName || "",
            };
            form.update_log = [...(form.update_log || []), openLog];
            await malshabimFetch(`/api/malshabim/candidates/${editId}`, {
              method: "PATCH",
              body: JSON.stringify({ update_log_entry: openLog }),
            });
          }
          setData(form);
          setOriginal(form);
          if (res.candidate.is_draft && res.candidate.draft_step != null) {
            setStep(Math.min(Math.max(0, res.candidate.draft_step), STEPS.length - 1));
          }
        } else {
          const [list, interviewersRes] = await Promise.all([
            malshabimFetch<{ role: ModuleRole }>("/api/malshabim/candidates"),
            interviewersPromise,
          ]);
          setInterviewers(
            (interviewersRes.interviewers || []).map((u) => ({
              id: u.id || (u as { user_id?: string }).user_id || "",
              name: u.name,
            })),
          );
          setCanEdit(canEditRole(list.role));
          setData(emptyDraft());
        }
      } catch {
        toast.error("טעינת הראיון נכשלה");
      } finally {
        setLoaded(true);
      }
    })();
  }, [editId]);

  if (!loaded || !data) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className={formShellClass}>
        <article className={`${panelClass} p-8 text-center`}>
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-rose-600" />
          <h1 className="text-2xl font-extrabold text-text-primary">אין לך הרשאת עריכה</h1>
          <p className="mt-2 text-sm text-text-secondary">
            משתמש צפייה בלבד יכול לצפות בפרטי מועמד, אך לא לפתוח או לערוך ראיון.
          </p>
          <Link href="/malshabim" className={`${secondaryButtonClass} mt-5`}>
            חזרה לבית
          </Link>
        </article>
      </div>
    );
  }

  const validateStep1 = () => {
    if (!data.full_name || !data.phone) {
      toast.error("יש למלא שם מלא ומספר פלאפון");
      return false;
    }
    if (!data.id_number && !data.personal_number) {
      toast.error("יש למלא ת.ז או מ.א");
      return false;
    }
    if (data.id_number && !validateIsraeliId(data.id_number)) {
      toast.error("תעודת זהות לא תקינה");
      return false;
    }
    if (
      (data.request_type === "איתור" || data.request_type === "בקשה") &&
      !(data.request_meta?.requester || "").trim()
    ) {
      toast.error("יש למלא שם מבקש");
      return false;
    }
    return true;
  };

  const validateObservance = () => {
    const obs = data.observance || {};
    for (const q of OBSERVANCE_QUESTIONS) {
      const answer = obs[q.key]?.answer;
      if (answer !== "כן" && answer !== "לא") return false;
      if (q.noteRequired && !(obs[q.key]?.note || "").trim()) {
        toast.error("יש למלא הערה לשאלת התפילות");
        return false;
      }
    }
    return true;
  };

  const hasFailedObservance = () => {
    const obs = data.observance || {};
    return OBSERVANCE_QUESTIONS.some((q) => obs[q.key]?.answer === "לא");
  };

  const next = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1) {
      if (!validateObservance()) {
        if (
          !OBSERVANCE_QUESTIONS.every((q) => {
            const a = data.observance?.[q.key]?.answer;
            return a === "כן" || a === "לא";
          })
        ) {
          toast.error("יש לענות על כל שאלות שמירת המצוות");
        }
        return;
      }
      if (hasFailedObservance()) {
        setShowObservanceWarning(true);
        return;
      }
      setObservanceFailed(false);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const saveDraft = async () => {
    if (!data.full_name || !data.phone) {
      toast.error("יש למלא לפחות שם מלא ומספר פלאפון לשמירת טיוטה");
      return;
    }
    setSaving(true);
    const draftLogEntry = {
      date: new Date().toISOString(),
      changes: `שמירת טיוטה (שלב: ${STEPS[step]})`,
      updated_by: userName || "משתמש",
    };
    const payload = {
      ...toPayload(data),
      is_draft: true,
      draft_step: step,
      update_log: [...(data.update_log || []), draftLogEntry],
    };
    try {
      if (editId) {
        await malshabimFetch(`/api/malshabim/candidates/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await malshabimFetch("/api/malshabim/candidates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      toast.success("הטיוטה נשמרה");
      router.push("/malshabim");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת טיוטה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const checkDuplicates = async () => {
    const all = await malshabimFetch<{ candidates: MalshabimCandidate[] }>(
      "/api/malshabim/candidates",
    );
    const others = all.candidates.filter((c) => c.id !== editId && !c.is_draft);
    if (data.id_number) {
      const dup = others.find((c) => c.id_number && c.id_number === data.id_number);
      if (dup) return { field: "תעודת זהות", existingName: dup.full_name || "—" };
    }
    if (data.personal_number) {
      const dup = others.find(
        (c) => c.personal_number && c.personal_number === data.personal_number,
      );
      if (dup) return { field: "מספר אישי (מ.א)", existingName: dup.full_name || "—" };
    }
    return null;
  };

  const save = async (opts?: { openForApproval?: boolean }) => {
    if (data.id_number && !validateIsraeliId(data.id_number)) {
      toast.error("תעודת זהות לא תקינה — יש לתקן לפני השמירה");
      return;
    }
    setSaving(true);
    try {
      const dup = await checkDuplicates();
      if (dup) {
        setDuplicateAlert(dup);
        setSaving(false);
        return;
      }

      const openForApproval =
        opts?.openForApproval ?? (!editId || Boolean(data.is_draft));
      const payload = {
        ...toPayload(data),
        is_draft: false,
        draft_step: null as number | null,
        ...(openForApproval
          ? {
              awaiting_admin_approval: true,
              candidate_status: "בטיפול",
              approval_requested_at: new Date().toISOString(),
            }
          : {}),
      };

      if (payload.quiz_questions?.length) {
        const scored = payload.quiz_skipped
          ? payload.quiz_questions.slice(0, 5)
          : payload.quiz_questions;
        const correct = scored.filter((q) => q.is_correct === true).length;
        payload.quiz_score = correct;
        payload.quiz_passed = payload.quiz_skipped ? correct >= 4 : correct >= 11;
      }

      if (editId) {
        const changes = computeChanges(
          original as unknown as Parameters<typeof computeChanges>[0],
          data as unknown as Parameters<typeof computeChanges>[1],
        );
        const logEntries = [...(data.update_log || [])];
        if (changes.length > 0) {
          changes.forEach((change) => {
            logEntries.push({
              date: new Date().toISOString(),
              changes: change,
              updated_by: userName || "משתמש",
            });
          });
        } else {
          logEntries.push({
            date: new Date().toISOString(),
            changes: "שמירת תיק (ללא שינויים)",
            updated_by: userName || "משתמש",
          });
        }
        payload.update_log = logEntries;
        await malshabimFetch(`/api/malshabim/candidates/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("התיק נשמר בהצלחה");
        router.push(`/malshabim/candidates/${editId}`);
      } else {
        payload.update_log = [
          {
            date: new Date().toISOString(),
            changes: "יצירת תיק לאישור מנהל",
            updated_by: userName || "משתמש",
          },
        ];
        const created = await malshabimFetch<{ candidate: MalshabimCandidate }>(
          "/api/malshabim/candidates",
          { method: "POST", body: JSON.stringify(payload) },
        );
        toast.success("התיק נפתח לאישור מנהל");
        router.push(`/malshabim/candidates/${created.candidate.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const screens = [
    <StepPersonal
      key="p"
      data={data}
      onChange={setData}
      interviewers={interviewers}
    />,
    <StepObservance key="o" data={data} onChange={setData} />,
    <StepQuiz key="q" data={data} onChange={setData} />,
    <StepSummary key="s" data={data} onChange={setData} />,
  ];

  return (
    <div className={formShellClass} dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
          {editId ? "עריכת תיק מלש״ב" : "ראיון חדש"}
        </h1>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setShowLeaveConfirm(true)}
        >
          חזרה
        </button>
      </div>

      <div className="flex items-center justify-between gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <button
              type="button"
              className="flex flex-1 flex-col items-center"
              onClick={() => setStep(i)}
              aria-label={`מעבר לשלב ${label}`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold transition ${
                  i <= step
                    ? "bg-accent-primary text-white"
                    : "bg-surface-2 text-text-muted"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`mt-1 text-center text-[10px] sm:text-xs ${
                  i === step ? "font-bold text-accent-primary" : "text-text-muted"
                }`}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 ? (
              <div
                className={`mx-1 h-1 flex-1 rounded-full ${
                  i < step ? "bg-accent-primary" : "bg-surface-2"
                }`}
              />
            ) : null}
          </div>
        ))}
      </div>

      <article className={`${panelClass} p-5 sm:p-6`}>
        {step === 3 && observanceFailed ? (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
            <p className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              אחת מהתשובות היא &quot;לא&quot;
            </p>
            <p className="mt-2">{OBSERVANCE_FAIL_MESSAGE}</p>
          </div>
        ) : null}
        {screens[step]}
      </article>

      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronRight className="h-4 w-4" /> הקודם
        </button>
        <div className="flex flex-wrap gap-2">
          {!editId ? (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => void saveDraft()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              שמור טיוטה
            </button>
          ) : null}
          {editId ? (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => void save({ openForApproval: false })}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              שמור
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button type="button" className={primaryButtonClass} onClick={next}>
              הבא <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              className={primaryButtonClass}
              onClick={() =>
                void save({ openForApproval: !editId || Boolean(data.is_draft) })
              }
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {!editId || data.is_draft ? "פתח תיק לאישור מנהל" : "שמור"}
            </button>
          )}
        </div>
      </div>

      {duplicateAlert ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${panelClass} max-w-md p-6`} dir="rtl">
            <h2 className="flex items-center gap-2 text-lg font-bold text-rose-600">
              <AlertTriangle className="h-5 w-5" /> נתון כפול במערכת
            </h2>
            <p className="mt-3 text-sm text-text-secondary">
              <span className="font-semibold">{duplicateAlert.field}</span> שהוזן כבר קיים בתיק של{" "}
              <span className="font-bold text-text-primary">{duplicateAlert.existingName}</span>.
            </p>
            <button
              type="button"
              className={`${primaryButtonClass} mt-5`}
              onClick={() => setDuplicateAlert(null)}
            >
              הבנתי, אתקן
            </button>
          </div>
        </div>
      ) : null}

      {showLeaveConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${panelClass} max-w-md p-6`} dir="rtl">
            <h2 className="text-lg font-bold text-text-primary">האם לשמור טיוטה?</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className={primaryButtonClass}
                disabled={saving}
                onClick={() => {
                  setShowLeaveConfirm(false);
                  void saveDraft();
                }}
              >
                כן
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => {
                  setShowLeaveConfirm(false);
                  router.push("/malshabim");
                }}
              >
                לא
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setShowLeaveConfirm(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showObservanceWarning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${panelClass} max-w-md p-6`} dir="rtl">
            <h2 className="flex items-center gap-2 text-lg font-bold text-rose-600">
              <AlertTriangle className="h-5 w-5" /> אחת מהתשובות היא &quot;לא&quot;
            </h2>
            <p className="mt-3 text-sm text-text-secondary">{OBSERVANCE_FAIL_MESSAGE}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setShowObservanceWarning(false)}
              >
                תקן תשובות
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white"
                onClick={() => {
                  setShowObservanceWarning(false);
                  setObservanceFailed(true);
                  setData((prev) =>
                    prev ? { ...prev, quiz_skipped: true } : prev,
                  );
                  setStep(3);
                }}
              >
                המשך בכל זאת לסיכום
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
