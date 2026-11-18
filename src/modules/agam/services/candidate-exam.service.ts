import { BaseService } from "@/services/base.service";
import {
  CANDIDATE_EXAMS,
  getCandidateExam,
  type CandidateExamDefinition,
  type CandidateExamKind,
} from "@/modules/agam/lib/candidate-exams-catalog";
import { CANDIDATE_EXAM_ANSWER_KEY } from "@/modules/agam/lib/candidate-exams-answer-key";
import { isExamOpen, israelTodayIso, resolveExamOpening } from "@/modules/agam/lib/exam-openings";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";
import type { AgamCandidate, AgamCycle } from "@/modules/agam/types";

type ExamCandidate = Pick<AgamCandidate, "id" | "cycle_id">;

export type CandidateExamAnswers = Record<string, string[]>;

export type CandidateExamAttempt = {
  id: string;
  candidate_id: string;
  exam_id: string;
  answers: CandidateExamAnswers;
  answered_count: number;
  question_count: number;
  status: "in_progress" | "submitted";
  started_at: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CandidateExamBoardItem = {
  id: string;
  title: string;
  category: string;
  blurb: string;
  kind: CandidateExamKind;
  questionCount: number;
  status: "not_started" | "in_progress" | "submitted";
  answeredCount: number;
  submittedAt: string | null;
  attemptId: string | null;
  /** Scheduled exams only: effective open date (YYYY-MM-DD) or null when not set yet. */
  opensOn: string | null;
  locked: boolean;
  /** Submitted attempts only. */
  result: CandidateExamResult | null;
};

function asJson(value: unknown): string {
  return JSON.stringify(value);
}

function normalizeAnswers(
  raw: unknown,
  exam: CandidateExamDefinition,
): CandidateExamAnswers {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const allowed = new Map(exam.questions.map((question) => [question.id, question]));
  const next: CandidateExamAnswers = {};
  for (const [questionId, value] of Object.entries(source)) {
    const question = allowed.get(questionId);
    if (!question) continue;
    const optionIds = new Set(question.options.map((option) => option.id));
    const selected = (Array.isArray(value) ? value : [value])
      .map((item) => String(item))
      .filter((id) => optionIds.has(id));
    const unique = [...new Set(selected)];
    if (!question.multi && unique.length > 1) {
      next[questionId] = [unique[0]!];
    } else if (unique.length > 0) {
      next[questionId] = unique;
    }
  }
  return next;
}

export type CandidateExamResult = { correct: number; total: number; score: number };

/** Every question weighs the same; the score out of 100 is rounded up. Multi-answer questions need the exact set. */
export function gradeCandidateExam(examId: string, answers: CandidateExamAnswers): CandidateExamResult | null {
  const exam = getCandidateExam(examId);
  const key = CANDIDATE_EXAM_ANSWER_KEY[examId];
  if (!exam || !key) return null;
  const total = exam.questions.length;
  const correct = exam.questions.filter((question) => {
    const expected = key[question.id] ?? [];
    const given = answers[question.id] ?? [];
    return given.length === expected.length && expected.every((id) => given.includes(id));
  }).length;
  return { correct, total, score: Math.ceil((correct * 100) / total) };
}

function countAnswered(answers: CandidateExamAnswers): number {
  return Object.values(answers).filter((value) => value.length > 0).length;
}

function parseAttempt(row: CandidateExamAttempt): CandidateExamAttempt {
  const answers =
    row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)
      ? (row.answers as CandidateExamAnswers)
      : {};
  return { ...row, answers };
}

export class AgamCandidateExamService extends BaseService {
  public getDefinition(examId: string) {
    return getCandidateExam(examId);
  }

  private async cycleFor(candidate: ExamCandidate): Promise<AgamCycle | null> {
    return candidate.cycle_id ? new AgamCycleService().getById(candidate.cycle_id) : null;
  }

  private availability(exam: CandidateExamDefinition, cycle: AgamCycle | null, today: string) {
    if (exam.kind === "practice") return { opensOn: null, locked: false };
    const { opensOn } = resolveExamOpening(cycle, exam.id);
    return { opensOn, locked: !isExamOpen(opensOn, today) };
  }

  /** Null when the exam is open for this candidate, otherwise a Hebrew reason. */
  public async lockReason(candidate: ExamCandidate, exam: CandidateExamDefinition): Promise<string | null> {
    if (exam.kind === "practice") return null;
    const { opensOn, locked } = this.availability(exam, await this.cycleFor(candidate), israelTodayIso());
    if (!locked) return null;
    return opensOn ? "המבחן עדיין לא נפתח" : "מועד המבחן טרם נקבע";
  }

  public async listLatestAttempts(candidateId: string): Promise<CandidateExamAttempt[]> {
    const db = this.getDb();
    try {
      const rows = await db<CandidateExamAttempt[]>`
        select distinct on (exam_id)
          id, candidate_id, exam_id, answers, answered_count, question_count,
          status, started_at, submitted_at, created_at, updated_at
        from agam_candidate_exam_attempts
        where candidate_id = ${candidateId}
        order by exam_id, updated_at desc
      `;
      return rows.map(parseAttempt);
    } catch (error) {
      console.warn("[agam/exams] listLatestAttempts failed (table missing?):", error);
      return [];
    }
  }

  public async buildBoard(candidate: ExamCandidate): Promise<CandidateExamBoardItem[]> {
    const [attempts, cycle] = await Promise.all([this.listLatestAttempts(candidate.id), this.cycleFor(candidate)]);
    const byExam = new Map(attempts.map((row) => [row.exam_id, row]));
    const today = israelTodayIso();
    return CANDIDATE_EXAMS.map((exam) => {
      const attempt = byExam.get(exam.id);
      return {
        id: exam.id,
        title: exam.title,
        category: exam.category,
        blurb: exam.blurb,
        kind: exam.kind,
        questionCount: exam.questions.length,
        status: attempt?.status ?? "not_started",
        answeredCount: attempt?.answered_count ?? 0,
        submittedAt: attempt?.submitted_at ?? null,
        attemptId: attempt?.id ?? null,
        result: attempt?.status === "submitted" ? gradeCandidateExam(exam.id, attempt.answers) : null,
        ...this.availability(exam, cycle, today),
      };
    });
  }

  public async getLatestForExam(
    candidateId: string,
    examId: string,
  ): Promise<CandidateExamAttempt | null> {
    if (!getCandidateExam(examId)) return null;
    const db = this.getDb();
    try {
      const rows = await db<CandidateExamAttempt[]>`
        select
          id, candidate_id, exam_id, answers, answered_count, question_count,
          status, started_at, submitted_at, created_at, updated_at
        from agam_candidate_exam_attempts
        where candidate_id = ${candidateId} and exam_id = ${examId}
        order by updated_at desc
        limit 1
      `;
      return rows[0] ? parseAttempt(rows[0]) : null;
    } catch (error) {
      console.warn("[agam/exams] getLatestForExam failed:", error);
      return null;
    }
  }

  public async saveAttempt(input: {
    candidateId: string;
    examId: string;
    answers: unknown;
    status: "in_progress" | "submitted";
    restart?: boolean;
  }): Promise<CandidateExamAttempt> {
    const exam = getCandidateExam(input.examId);
    if (!exam) throw new Error("EXAM_NOT_FOUND");

    const answers = normalizeAnswers(input.answers, exam);
    const answeredCount = countAnswered(answers);
    const questionCount = exam.questions.length;
    const db = this.getDb();

    const latest = await this.getLatestForExam(input.candidateId, input.examId);
    if (exam.kind === "scheduled" && latest?.status === "submitted") {
      throw new Error("ALREADY_SUBMITTED");
    }
    // Only create a new row when there is no draft. Restart of a submitted exam
    // opens a fresh in_progress attempt; restart of a draft just resets it.
    const shouldCreate =
      !latest || (latest.status === "submitted" && (input.restart || input.status === "in_progress"));

    if (shouldCreate) {
      const rows = await db<CandidateExamAttempt[]>`
        insert into agam_candidate_exam_attempts (
          candidate_id, exam_id, answers, answered_count, question_count,
          status, submitted_at
        )
        values (
          ${input.candidateId},
          ${input.examId},
          ${asJson(answers)}::text::jsonb,
          ${answeredCount},
          ${questionCount},
          ${input.status},
          ${input.status === "submitted" ? new Date().toISOString() : null}
        )
        returning
          id, candidate_id, exam_id, answers, answered_count, question_count,
          status, started_at, submitted_at, created_at, updated_at
      `;
      return parseAttempt(rows[0]!);
    }

    if (latest.status === "submitted" && input.status === "submitted") {
      // Allow re-submit only via restart → new attempt.
      throw new Error("ALREADY_SUBMITTED");
    }

    const rows = await db<CandidateExamAttempt[]>`
      update agam_candidate_exam_attempts
      set
        answers = ${asJson(answers)}::text::jsonb,
        answered_count = ${answeredCount},
        question_count = ${questionCount},
        status = ${input.status},
        submitted_at = case
          when ${input.status}::text = 'submitted' then now()
          else submitted_at
        end,
        updated_at = now()
      where id = ${latest.id}
      returning
        id, candidate_id, exam_id, answers, answered_count, question_count,
        status, started_at, submitted_at, created_at, updated_at
    `;
    return parseAttempt(rows[0]!);
  }
}
