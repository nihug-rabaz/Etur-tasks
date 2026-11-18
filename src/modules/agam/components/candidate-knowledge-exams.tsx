"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Dumbbell,
  Loader2,
  Lock,
  PenLine,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
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
  CandidateExamResult,
} from "@/modules/agam/services/candidate-exam.service";
import type { CandidateExamKind, CandidateExamQuestion } from "@/modules/agam/lib/candidate-exams-catalog";

type ExamDetail = {
  id: string;
  title: string;
  category: string;
  blurb: string;
  kind: CandidateExamKind;
  questions: CandidateExamQuestion[];
};

type ExamDetailResponse = {
  exam: ExamDetail;
  attempt: CandidateExamAttempt | null;
};

const HEBREW_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י"];

const pillClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold";

function ExamIcon({ examId, size }: { examId: string; size: number }) {
  return examId.startsWith("weapon") ? <Crosshair size={size} /> : <BookOpen size={size} />;
}

function StatusPill({ exam }: { exam: CandidateExamBoardItem }) {
  if (exam.locked) {
    return (
      <span className={`${pillClass} bg-surface-1 text-text-muted`}>
        <Lock size={10} strokeWidth={2.75} />
        נעול
      </span>
    );
  }
  if (exam.status === "submitted") {
    return (
      <span className={`${pillClass} bg-emerald-500/15 text-emerald-800 dark:text-emerald-200`}>
        <Check size={10} strokeWidth={3} />
        הוגש
      </span>
    );
  }
  if (exam.status === "in_progress") {
    return <span className={`${pillClass} bg-amber-500/15 text-amber-800 dark:text-amber-200`}>בתהליך</span>;
  }
  if (exam.kind === "scheduled") {
    return <span className={`${pillClass} bg-violet-500/15 text-violet-800 dark:text-violet-200`}>פתוח עכשיו</span>;
  }
  return null;
}

function ExamGroupHeader({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "official" | "practice";
}) {
  const iconTone =
    tone === "official"
      ? "bg-violet-500/12 text-violet-700 dark:text-violet-300"
      : "bg-sky-500/12 text-sky-700 dark:text-sky-300";
  return (
    <div className="flex items-start gap-2.5">
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <h4 className="text-sm font-extrabold text-text-primary">{title}</h4>
        <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">{description}</p>
      </div>
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 80) return "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200";
  if (score >= 60) return "bg-amber-500/12 text-amber-800 dark:text-amber-200";
  return "bg-rose-500/12 text-rose-800 dark:text-rose-200";
}

function ScoreBanner({ result }: { result: CandidateExamResult }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 ${scoreTone(result.score)}`}>
      <div className="flex shrink-0 flex-col items-center leading-none">
        <span className="text-[34px] font-black tabular-nums">{result.score}</span>
        <span className="mt-1 text-[11px] font-extrabold opacity-75">מתוך 100</span>
      </div>
      <div className="min-w-0 border-s border-current/20 ps-4">
        <p className="text-sm font-extrabold">הציון שלכם</p>
        <p className="mt-0.5 text-[13px] font-bold tabular-nums opacity-90">
          {result.correct} מתוך {result.total} תשובות נכונות
        </p>
      </div>
    </div>
  );
}

function ExamCard({ exam, onOpen }: { exam: CandidateExamBoardItem; onOpen: () => void }) {
  const official = exam.kind === "scheduled";
  const accent = official
    ? "bg-violet-500/12 text-violet-700 dark:text-violet-300"
    : "bg-sky-500/12 text-sky-700 dark:text-sky-300";

  const cta = official
    ? exam.status === "submitted"
      ? "צפייה בתשובות שהוגשו"
      : exam.status === "in_progress"
        ? "המשך מבחן"
        : "התחלת מבחן"
    : exam.status === "submitted"
      ? "צפייה בתשובות / תרגול חוזר"
      : exam.status === "in_progress"
        ? "המשך תרגול"
        : "התחלת תרגול";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={exam.locked}
      className={`group flex h-full flex-col rounded-2xl p-3.5 text-start transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        exam.locked
          ? "cursor-not-allowed bg-surface-2/50"
          : official
            ? "bg-surface-2/80 hover:bg-violet-500/[0.07] focus-visible:outline-violet-600"
            : "bg-surface-2/80 hover:bg-sky-500/[0.07] focus-visible:outline-sky-600"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
            exam.locked ? "bg-surface-1 text-text-muted" : accent
          }`}
        >
          {exam.locked ? <Lock size={16} /> : <ExamIcon examId={exam.id} size={17} />}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-1">
          {official ? null : (
            <span className={`${pillClass} bg-sky-500/12 text-sky-800 dark:text-sky-200`}>
              <Dumbbell size={10} strokeWidth={2.5} />
              תרגול
            </span>
          )}
          <StatusPill exam={exam} />
        </span>
      </div>

      <h5 className={`mt-2.5 text-[15px] font-extrabold leading-snug ${exam.locked ? "text-text-secondary" : "text-text-primary"}`}>
        {exam.title}
      </h5>
      <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{exam.blurb}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-text-muted">
        <span>{exam.questionCount} שאלות</span>
        <span>{exam.category}</span>
        {exam.status === "in_progress" && !exam.locked ? (
          <span className="text-amber-700 dark:text-amber-200">
            {exam.answeredCount}/{exam.questionCount} נענו
          </span>
        ) : null}
        {exam.status === "submitted" && exam.submittedAt ? <span>הוגש {formatAgamDate(exam.submittedAt)}</span> : null}
      </div>

      {exam.status === "submitted" && exam.result ? (
        <div
          className={`mt-2.5 flex items-baseline gap-2 self-start rounded-xl px-2.5 py-1.5 ${scoreTone(exam.result.score)}`}
        >
          <span className="text-lg font-black tabular-nums leading-none">{exam.result.score}</span>
          <span className="text-[11px] font-extrabold tabular-nums">
            ציון · {exam.result.correct}/{exam.result.total} נכונות
          </span>
        </div>
      ) : null}

      <div className="mt-auto pt-3">
        {exam.locked ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-1 px-2.5 py-1.5 text-[12px] font-bold text-text-secondary">
            <CalendarClock size={13} />
            {exam.opensOn ? `ייפתח ב־${formatAgamDate(exam.opensOn)}` : "מועד הפתיחה טרם נקבע"}
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 text-[12px] font-extrabold opacity-90 transition group-hover:opacity-100 ${
              official ? "text-violet-700 dark:text-violet-300" : "text-sky-700 dark:text-sky-300"
            }`}
          >
            <PenLine size={13} />
            {cta}
          </span>
        )}
      </div>
    </button>
  );
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
        toast.success("התחלתם תרגול חדש");
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

  const officialExams = exams.filter((exam) => exam.kind === "scheduled");
  const practiceExams = exams.filter((exam) => exam.kind === "practice");
  const isPractice = detail?.kind === "practice";
  const activeResult = readOnly ? (exams.find((exam) => exam.id === activeId)?.result ?? null) : null;

  const subtitle = detail
    ? `${isPractice ? "תרגול" : "מבחן רשמי"} · ${detail.category} · שאלה ${Math.min(index + 1, total)} מתוך ${total}`
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
              {exams.length}
            </span>
          }
        />
        <div className="space-y-5 px-3.5 py-4 sm:px-4">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              טוען מבחנים…
            </div>
          ) : (
            <>
              {officialExams.length > 0 ? (
                <div>
                  <ExamGroupHeader
                    icon={ShieldCheck}
                    title="מבחנים רשמיים"
                    description="נפתחים במועד שנקבע למחזור שלכם. ניתן להגיש כל מבחן פעם אחת בלבד."
                    tone="official"
                  />
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {officialExams.map((exam) => (
                      <ExamCard key={exam.id} exam={exam} onOpen={() => void openExam(exam.id)} />
                    ))}
                  </div>
                </div>
              ) : null}

              {practiceExams.length > 0 ? (
                <div>
                  <ExamGroupHeader
                    icon={Dumbbell}
                    title="מבחני תרגול"
                    description="להכנה עצמית לקראת המבחנים הרשמיים. פתוחים תמיד, ואפשר לחזור עליהם כמה פעמים שתרצו."
                    tone="practice"
                  />
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {practiceExams.map((exam) => (
                      <ExamCard key={exam.id} exam={exam} onOpen={() => void openExam(exam.id)} />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
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
                {readOnly && !isPractice ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/12 px-3 py-2 text-xs font-extrabold text-emerald-800 dark:text-emerald-200">
                    <Check size={14} strokeWidth={3} />
                    המבחן הוגש
                  </span>
                ) : readOnly ? (
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
                    תרגול חוזר
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
                      {isPractice ? "הגשת תרגול" : "הגשת מבחן"}
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
              {activeResult ? <ScoreBanner result={activeResult} /> : null}
              <div
                className={`flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 ${
                  isPractice ? "bg-sky-500/[0.08]" : "bg-violet-500/[0.08]"
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isPractice
                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                      : "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                  }`}
                >
                  {isPractice ? <Dumbbell size={14} /> : <ShieldCheck size={14} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-text-primary">
                    {isPractice ? "מבחן תרגול" : "מבחן רשמי"}
                  </p>
                  <p className="text-[12px] leading-relaxed text-text-secondary">
                    {isPractice
                      ? "להכנה עצמית בלבד. אפשר לשמור, להגיש ולתרגל שוב בכל עת."
                      : "התשובות נשמרות אוטומטית במעבר בין שאלות. ניתן להגיש פעם אחת בלבד."}
                  </p>
                </div>
              </div>

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
                <p className="whitespace-pre-line text-[16px] font-extrabold leading-relaxed text-text-primary">
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
                        <span className="whitespace-pre-line pt-0.5 text-sm font-bold leading-relaxed text-text-primary">
                          {option.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {confirmSubmit ? (
                <div className="rounded-2xl bg-amber-500/10 px-4 py-3">
                  <p className="text-sm font-extrabold text-text-primary">
                    {isPractice ? "להגיש את התרגול?" : "להגיש את המבחן הרשמי?"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    נענו {doneIds.size} מתוך {total} שאלות.
                    {doneIds.size < total
                      ? " יש שאלות שטרם נענו — אפשר עדיין להגיש."
                      : " כל השאלות נענו."}
                    {isPractice ? "" : " לאחר ההגשה לא ניתן לשנות תשובות או להגיש שוב."}
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
