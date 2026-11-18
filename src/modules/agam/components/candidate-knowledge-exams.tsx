"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Loader2,
  PenLine,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { CaseSectionHead, caseCardClass } from "@/modules/agam/components/case-file-kit";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type {
  CandidateExamAnswers,
  CandidateExamAttempt,
  CandidateExamBoardItem,
} from "@/modules/agam/services/candidate-exam.service";
import type { CandidateExamQuestion } from "@/modules/agam/lib/candidate-exams-catalog";

type ExamDetail = {
  id: string;
  title: string;
  category: string;
  blurb: string;
  questions: CandidateExamQuestion[];
};

type ExamDetailResponse = {
  exam: ExamDetail;
  attempt: CandidateExamAttempt | null;
};

const HEBREW_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י"];

function statusLabel(status: CandidateExamBoardItem["status"]) {
  if (status === "submitted") return "הוגש";
  if (status === "in_progress") return "בתהליך";
  return "טרם התחיל";
}

function statusTone(status: CandidateExamBoardItem["status"]) {
  if (status === "submitted") {
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
  }
  if (status === "in_progress") {
    return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
  }
  return "bg-surface-2 text-text-muted";
}

function examIcon(examId: string) {
  return examId.startsWith("weapon") ? Crosshair : BookOpen;
}

function answeredSet(answers: CandidateExamAnswers, questions: CandidateExamQuestion[]) {
  return new Set(
    questions.filter((question) => (answers[question.id]?.length ?? 0) > 0).map((q) => q.id),
  );
}

export function CandidateKnowledgeExams({
  initialExams,
}: {
  initialExams?: CandidateExamBoardItem[];
}) {
  const [exams, setExams] = useState<CandidateExamBoardItem[]>(initialExams ?? []);
  const [loadingList, setLoadingList] = useState(!initialExams);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExamDetail | null>(null);
  const [answers, setAnswers] = useState<CandidateExamAnswers>({});
  const [readOnly, setReadOnly] = useState(false);
  const [index, setIndex] = useState(0);
  const [loadingExam, setLoadingExam] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await agamFetch<{ exams: CandidateExamBoardItem[] }>("/api/agam/me/exams");
      setExams(data.exams);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "טעינת המבחנים נכשלה");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (initialExams) {
      setExams(initialExams);
      setLoadingList(false);
      return;
    }
    void loadBoard();
  }, [initialExams, loadBoard]);

  const openExam = async (examId: string) => {
    setActiveId(examId);
    setLoadingExam(true);
    setConfirmSubmit(false);
    setIndex(0);
    try {
      const data = await agamFetch<ExamDetailResponse>(`/api/agam/me/exams/${examId}`);
      setDetail(data.exam);
      const isSubmitted = data.attempt?.status === "submitted";
      setReadOnly(isSubmitted);
      setAnswers({ ...(data.attempt?.answers ?? {}) });
    } catch (error) {
      setActiveId(null);
      setDetail(null);
      toast.error(error instanceof Error ? error.message : "טעינת המבחן נכשלה");
    } finally {
      setLoadingExam(false);
    }
  };

  const closeExam = () => {
    setActiveId(null);
    setDetail(null);
    setAnswers({});
    setConfirmSubmit(false);
    setReadOnly(false);
  };

  const currentQuestion = detail?.questions[index] ?? null;
  const total = detail?.questions.length ?? 0;
  const doneIds = useMemo(
    () => (detail ? answeredSet(answers, detail.questions) : new Set<string>()),
    [answers, detail],
  );
  const progress = total > 0 ? Math.round((doneIds.size / total) * 100) : 0;

  const toggleOption = (question: CandidateExamQuestion, optionId: string) => {
    if (readOnly) return;
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.multi) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [question.id]: next };
      }
      return { ...prev, [question.id]: [optionId] };
    });
  };

  const persist = async (
    status: "in_progress" | "submitted",
    options?: {
      restart?: boolean;
      overrideAnswers?: CandidateExamAnswers;
      quiet?: boolean;
    },
  ) => {
    if (!detail) return;
    const restart = Boolean(options?.restart);
    const quiet = Boolean(options?.quiet);
    setSaving(true);
    try {
      const payloadAnswers = options?.overrideAnswers ?? answers;
      const data = await agamFetch<{
        attempt: CandidateExamAttempt;
        exams: CandidateExamBoardItem[];
      }>(`/api/agam/me/exams/${detail.id}`, {
        method: "POST",
        body: JSON.stringify({ answers: payloadAnswers, status, restart }),
      });
      setExams(data.exams);
      setAnswers(data.attempt.answers ?? payloadAnswers);
      if (status === "submitted") {
        setReadOnly(true);
        setConfirmSubmit(false);
        toast.success("המבחן הוגש בהצלחה");
      } else if (restart) {
        setReadOnly(false);
        toast.success("התחלתם מבחן חדש");
      } else if (!quiet) {
        toast.success("התשובות נשמרו");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const goToQuestion = (nextIndex: number) => {
    if (!readOnly && detail) {
      void persist("in_progress", { quiet: true });
    }
    setIndex(nextIndex);
  };

  const subtitle = detail
    ? `${detail.category} · שאלה ${Math.min(index + 1, total)} מתוך ${total}`
    : undefined;

  return (
    <>
      <section className={caseCardClass} dir="rtl">
        <CaseSectionHead
          icon={Sparkles}
          title="מבחני ידע"
          tone="emerald"
          action={
            <span className="rounded-full bg-surface-1/80 px-2 py-0.5 text-[10px] font-bold tabular-nums text-text-muted">
              {exams.length || 4}
            </span>
          }
        />
        <div className="space-y-3 px-3.5 py-3.5 sm:px-4">
          <p className="text-sm leading-relaxed text-text-secondary">
            ארבעה מבחנים להשלמה מהסביבה האישית שלכם — מקראות ישראל ונשק. אפשר לשמור באמצע ולהגיש בסיום.
          </p>

          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              טוען מבחנים…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {exams.map((exam) => {
                const Icon = examIcon(exam.id);
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => void openExam(exam.id)}
                    className="group rounded-2xl bg-surface-2/80 p-3.5 text-start transition hover:bg-emerald-500/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                        <Icon size={17} />
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusTone(exam.status)}`}
                      >
                        {statusLabel(exam.status)}
                      </span>
                    </div>
                    <h4 className="mt-2.5 text-[15px] font-extrabold leading-snug text-text-primary">
                      {exam.title}
                    </h4>
                    <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{exam.blurb}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-text-muted">
                      <span>{exam.questionCount} שאלות</span>
                      <span>{exam.category}</span>
                      {exam.status === "in_progress" ? (
                        <span className="text-amber-700 dark:text-amber-200">
                          {exam.answeredCount}/{exam.questionCount} נענו
                        </span>
                      ) : null}
                      {exam.status === "submitted" && exam.submittedAt ? (
                        <span>הוגש {formatAgamDate(exam.submittedAt)}</span>
                      ) : null}
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-extrabold text-emerald-700 opacity-90 transition group-hover:opacity-100 dark:text-emerald-300">
                      <PenLine size={13} />
                      {exam.status === "submitted"
                        ? "צפייה בתשובות"
                        : exam.status === "in_progress"
                          ? "המשך מבחן"
                          : "התחלת מבחן"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Modal
        open={Boolean(activeId)}
        onClose={closeExam}
        title={detail?.title ?? "מבחן"}
        subtitle={subtitle}
        size="lg"
        footer={
          detail && !loadingExam ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" dir="rtl">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={index <= 0 || saving}
                  onClick={() => goToQuestion(Math.max(0, index - 1))}
                >
                  <ChevronRight size={16} />
                  הקודם
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={index >= total - 1 || saving}
                  onClick={() => goToQuestion(Math.min(total - 1, index + 1))}
                >
                  הבא
                  <ChevronLeft size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {readOnly ? (
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={saving}
                    onClick={() => {
                      setIndex(0);
                      setConfirmSubmit(false);
                      void persist("in_progress", { restart: true, overrideAnswers: {} });
                    }}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                    התחלה מחדש
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={saving}
                      onClick={() => void persist("in_progress")}
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                      שמירה
                    </button>
                    <button
                      type="button"
                      className={primaryButtonClass}
                      disabled={saving}
                      onClick={() => setConfirmSubmit(true)}
                    >
                      <Send size={14} />
                      הגשת מבחן
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null
        }
      >
        <div className="space-y-4" dir="rtl">
          {loadingExam || !detail || !currentQuestion ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              טוען שאלות…
            </div>
          ) : (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold text-text-muted">
                  <span>
                    {doneIds.size} מתוך {total} נענו
                  </span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {detail.questions.map((question, questionIndex) => {
                    const answered = doneIds.has(question.id);
                    const active = questionIndex === index;
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => goToQuestion(questionIndex)}
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[11px] font-extrabold tabular-nums transition ${
                          active
                            ? "bg-emerald-600 text-white"
                            : answered
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                              : "bg-surface-2 text-text-muted hover:bg-surface-2/90"
                        }`}
                        aria-label={`שאלה ${questionIndex + 1}`}
                      >
                        {questionIndex + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-surface-2/60 px-4 py-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface-1 px-2.5 py-1 text-[11px] font-extrabold text-text-muted">
                    שאלה {index + 1}
                  </span>
                  {currentQuestion.multi ? (
                    <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-extrabold text-sky-800 dark:text-sky-200">
                      בחירה מרובה
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-1 px-2.5 py-1 text-[11px] font-extrabold text-text-muted">
                      בחירה אחת
                    </span>
                  )}
                  {readOnly ? (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-200">
                      לתצוגה בלבד
                    </span>
                  ) : null}
                </div>
                <p className="text-[16px] font-extrabold leading-relaxed text-text-primary">
                  {currentQuestion.prompt}
                </p>
              </div>

              <ul className="space-y-2">
                {currentQuestion.options.map((option, optionIndex) => {
                  const selected = (answers[currentQuestion.id] ?? []).includes(option.id);
                  const letter = HEBREW_LETTERS[optionIndex] ?? String(optionIndex + 1);
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleOption(currentQuestion, option.id)}
                        className={`flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-start transition ${
                          selected
                            ? "bg-emerald-500/12 ring-1 ring-emerald-500/35"
                            : "bg-surface-2/70 hover:bg-surface-2"
                        } ${readOnly ? "cursor-default opacity-95" : ""}`}
                      >
                        <span
                          className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold ${
                            selected
                              ? "bg-emerald-600 text-white"
                              : "bg-surface-1 text-text-muted"
                          }`}
                        >
                          {selected ? <Check size={14} strokeWidth={3} /> : letter}
                        </span>
                        <span className="pt-0.5 text-sm font-bold leading-relaxed text-text-primary">
                          {option.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {confirmSubmit ? (
                <div className="rounded-2xl bg-amber-500/10 px-4 py-3">
                  <p className="text-sm font-extrabold text-text-primary">להגיש את המבחן?</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    נענו {doneIds.size} מתוך {total} שאלות.
                    {doneIds.size < total
                      ? " יש שאלות שטרם נענו — אפשר עדיין להגיש."
                      : " כל השאלות נענו."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={primaryButtonClass}
                      disabled={saving}
                      onClick={() => void persist("submitted", {})}
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      אישור הגשה
                    </button>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={saving}
                      onClick={() => setConfirmSubmit(false)}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
