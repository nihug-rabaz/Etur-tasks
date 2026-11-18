import { isQuestionVisible } from "@/modules/agam/lib/questions";
import type { AgamInterview, AgamQuestion } from "@/modules/agam/types";

function asStringMap(data: Record<string, unknown> | null | undefined): Record<string, string> {
  const next: Record<string, string> = {};
  if (!data) return next;
  for (const [key, value] of Object.entries(data)) {
    next[key] = value == null ? "" : String(value);
  }
  return next;
}

function isAnswered(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/** Candidate-facing interview questions (not staff-only evaluator fields). */
export function candidateInterviewQuestions(questions: AgamQuestion[]): AgamQuestion[] {
  return questions.filter((question) => question.is_active && !question.is_staff_only);
}

/**
 * What still blocks the screener from writing the interview.
 * Empty array = ready to continue.
 */
export function interviewMissingItems(
  interview: AgamInterview | null | undefined,
  questions: AgamQuestion[],
): string[] {
  if (interview?.candidate_part_completed_at) return [];

  const missing: string[] = [];
  if (!interview) {
    missing.push("המועמד עדיין לא התחיל את חלק הראיון בפורטל");
    return missing;
  }

  const answers = asStringMap(interview.candidate_part);
  const candidateQuestions = candidateInterviewQuestions(questions);
  const visibleRequired = candidateQuestions.filter(
    (question) => question.is_required && isQuestionVisible(question, answers),
  );
  const unanswered = visibleRequired.filter((question) => !isAnswered(answers[question.field_key]));

  if (unanswered.length > 0) {
    for (const question of unanswered) {
      missing.push(`חסרה תשובה: ${question.question_text}`);
    }
  }

  missing.push("המועמד עדיין לא סימן את חלק הראיון כהושלם בפורטל");
  return missing;
}

export function interviewReady(
  interview: AgamInterview | null | undefined,
  questions: AgamQuestion[],
): boolean {
  return interviewMissingItems(interview, questions).length === 0;
}
