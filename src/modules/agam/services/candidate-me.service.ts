import { BaseService } from "@/services/base.service";
import {
  DOC_TYPES,
  documentMatchesType,
  isSportsResultsDocument,
  requiredDocuments,
  SPORTS_RESULTS_DOC_TYPE,
} from "@/modules/agam/lib/document-types";
import { documentDownloadHref } from "@/modules/agam/lib/document-download";
import { groupQuestionsBySection } from "@/modules/agam/lib/questions";
import {
  LEGACY_THRESHOLD_KEYS,
  PROFESSIONAL_CRITERIA,
  STATUS_LABELS,
  THRESHOLD_TESTS,
  computeThresholdPass,
  normalizeThresholdTests,
} from "@/modules/agam/lib/stages";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamDayEvaluationService, AgamCriterionService } from "@/modules/agam/services/evaluation.service";
import { AgamDocumentService } from "@/modules/agam/services/document.service";
import { AgamInterviewService } from "@/modules/agam/services/interview.service";
import { AgamPrepDayService } from "@/modules/agam/services/prep-day.service";
import { AgamQuestionService } from "@/modules/agam/services/question.service";
import { AgamSmachService } from "@/modules/agam/services/smach.service";
import type { AgamCandidate, AgamDocument, AgamQuestion } from "@/modules/agam/types";

export type CandidateMePayload = {
  candidate: {
    id: string;
    full_name: string;
    personal_number: string;
    phone: string | null;
    email: string | null;
    cycle_name: string | null;
    status: string;
    status_label: string;
  };
  stages: Awaited<ReturnType<AgamCandidateService["getTrackProgress"]>>;
  currentStage: Awaited<ReturnType<AgamCandidateService["getTrackProgress"]>>[number] | null;
  personalDetails: Array<{
    section: string;
    fields: Array<{ key: string; label: string; value: string }>;
  }>;
  scores: {
    dayEvaluations: Array<{
      evaluator_name: string | null;
      final_score: number | null;
      weighted_score: number | null;
      passed: boolean | null;
      scores: Array<{ key: string; label: string; value: number }>;
    }>;
    interviews: Array<{
      evaluator_name: string | null;
      recommendation: string | null;
      completed: boolean;
    }>;
    prepDays: Array<{
      evaluator_name: string | null;
      mikra_score: number | null;
      conversation_score: number | null;
      social_dynamics_score: number | null;
      passed: boolean | null;
    }>;
    smach: Array<{
      evaluator_name: string | null;
      weighted_score: number | null;
      passed: boolean | null;
      decision: string | null;
      thresholds: Array<{
        key: string;
        label: string;
        value: string | null;
        pass: boolean | null;
      }>;
      professional: Array<{ key: string; label: string; value: number | null }>;
    }>;
    tests: Array<{ key: string; label: string; value: string | null; pass: boolean | null; group: "tests" | "fitness" }>;
  };
  sportsResults: Array<{
    id: string;
    name: string;
    href: string;
    created_at: string;
  }>;
  documents: {
    required: Array<{
      key: string;
      type: string;
      reason: string;
      uploaded: boolean;
      approved: boolean;
      documentId: string | null;
      documentName: string | null;
    }>;
    uploaded: Array<{
      id: string;
      name: string;
      document_type: string | null;
      approved: boolean;
      created_at: string;
    }>;
    docTypes: string[];
  };
};

export class AgamCandidateMeService extends BaseService {
  private readonly candidates = new AgamCandidateService();
  private readonly questions = new AgamQuestionService();
  private readonly dayEvals = new AgamDayEvaluationService();
  private readonly criteria = new AgamCriterionService();
  private readonly interviews = new AgamInterviewService();
  private readonly prepDays = new AgamPrepDayService();
  private readonly smach = new AgamSmachService();
  private readonly documents = new AgamDocumentService();

  public async resolveForUser(userId: string, email: string | null | undefined): Promise<AgamCandidate | null> {
    let candidate = await this.candidates.findByLinkedUser(userId);
    if (!candidate && email) {
      candidate = await this.candidates.findByEmail(email);
      if (candidate && !candidate.linked_user_id) {
        await this.candidates.setLinkedUser(candidate.id, userId);
        candidate = { ...candidate, linked_user_id: userId };
      }
    }
    if (!candidate || candidate.archived) return null;
    if (candidate.linked_user_id && candidate.linked_user_id !== userId) return null;
    return candidate;
  }

  public async buildPayload(candidate: AgamCandidate): Promise<CandidateMePayload> {
    const [stages, questions, dayEvaluations, criteria, interviews, prepDays, smach, documents] =
      await Promise.all([
        this.candidates.getTrackProgress(candidate.id),
        this.questions.listActive("pre_screening", { includeStaffOnly: false }),
        this.dayEvals.listByCandidate(candidate.id),
        this.criteria.listActive(),
        this.interviews.listByCandidate(candidate.id),
        this.prepDays.listByCandidate(candidate.id),
        this.smach.listByCandidate(candidate.id),
        this.documents.listByCandidate(candidate.id),
      ]);

    const criterionLabel = new Map(criteria.map((row) => [row.key, row.name]));
    const questionnaire = (candidate.questionnaire_data ?? {}) as Record<string, unknown>;

    return {
      candidate: {
        id: candidate.id,
        full_name: candidate.full_name,
        personal_number: candidate.personal_number,
        phone: candidate.phone,
        email: candidate.email,
        cycle_name: candidate.cycle_name ?? null,
        status: candidate.status,
        status_label: STATUS_LABELS[candidate.status] ?? candidate.status,
      },
      stages,
      currentStage: stages.find((stage) => stage.state === "current") ?? null,
      personalDetails: this.personalDetails(questions, questionnaire, candidate),
      scores: {
        dayEvaluations: dayEvaluations.map((row) => ({
          evaluator_name: row.evaluator_name,
          final_score: row.final_score,
          weighted_score: row.weighted_score,
          passed: row.passed,
          scores: Object.entries(row.scores_data ?? {})
            .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
            .map(([key, value]) => ({
              key,
              label: criterionLabel.get(key) ?? key,
              value: value as number,
            })),
        })),
        interviews: interviews.map((row) => ({
          evaluator_name: row.evaluator_name,
          recommendation: row.recommendation,
          completed: Boolean(row.evaluator_part_completed_at || row.recommendation),
        })),
        prepDays: prepDays.map((row) => ({
          evaluator_name: row.evaluator_name,
          mikra_score: row.mikra_score,
          conversation_score: row.conversation_score,
          social_dynamics_score: row.social_dynamics_score,
          passed: row.passed,
        })),
        smach: smach.map((row) => {
          const thresholds = normalizeThresholdTests(
            (row.threshold_tests ?? {}) as Record<
              string,
              { score?: number | null; time?: string | null; count?: number | null; pass?: boolean | null; datum?: string | null }
            >,
          );
          return {
            evaluator_name: row.evaluator_name,
            weighted_score: row.weighted_score,
            passed: row.passed,
            decision: row.decision,
            thresholds: THRESHOLD_TESTS.map((test) => {
              const entry = thresholds[test.key];
              const value =
                entry == null
                  ? null
                  : test.inputType === "time"
                    ? entry.time ?? entry.datum ?? null
                    : test.inputType === "count"
                      ? entry.count != null
                        ? String(entry.count)
                        : entry.datum ?? null
                      : entry.score != null
                        ? String(entry.score)
                        : entry.datum ?? null;
              const pass =
                computeThresholdPass(test.key, {
                  score: entry?.score ?? (entry?.datum != null && test.inputType === "score" ? Number(entry.datum) : null),
                  time: entry?.time ?? (test.inputType === "time" ? entry?.datum : null),
                  count: entry?.count ?? (entry?.datum != null && test.inputType === "count" ? Number(entry.datum) : null),
                }) ?? entry?.pass ?? null;
              return { key: test.key, label: test.label, value, pass };
            }),
            professional: PROFESSIONAL_CRITERIA.map((criterion) => ({
              key: criterion.key,
              label: criterion.label,
              value: row.professional_scores?.[criterion.key] ?? null,
            })),
          };
        }),
        tests: this.aggregateTests(smach, prepDays),
      },
      sportsResults: documents.filter(isSportsResultsDocument).map((document) => ({
        id: document.id,
        name: document.name,
        href: documentDownloadHref(document.id),
        created_at: document.created_at,
      })),
      documents: this.documentsPayload(candidate, documents),
    };
  }

  private personalDetails(
    questions: AgamQuestion[],
    questionnaire: Record<string, unknown>,
    candidate: AgamCandidate,
  ) {
    const sections = groupQuestionsBySection(questions.filter((row) => row.is_active && !row.is_staff_only));
    const built = sections.map(([, section]) => ({
      section: section.name,
      fields: section.items
        .map((question) => {
          const raw = questionnaire[question.field_key];
          const value =
            raw == null || raw === ""
              ? question.field_key === "full_name"
                ? candidate.full_name
                : question.field_key === "personal_number"
                  ? candidate.personal_number
                  : question.field_key === "phone"
                    ? candidate.phone ?? ""
                    : question.field_key === "civilian_email"
                      ? candidate.email ?? ""
                      : ""
              : String(raw);
          return { key: question.field_key, label: question.question_text, value };
        })
        .filter((field) => field.value.trim() !== ""),
    }));
    return built.filter((section) => section.fields.length > 0);
  }

  private aggregateTests(
    smach: Awaited<ReturnType<AgamSmachService["listByCandidate"]>>,
    prepDays: Awaited<ReturnType<AgamPrepDayService["listByCandidate"]>>,
  ): CandidateMePayload["scores"]["tests"] {
    const byRecency = <T extends { created_at: string; updated_at?: string }>(rows: T[]) =>
      [...rows].sort(
        (a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime(),
      );

    const latestEntry = (key: string) => {
      const legacyKey = Object.entries(LEGACY_THRESHOLD_KEYS).find(([, modern]) => modern === key)?.[0];
      for (const row of byRecency(smach)) {
        const tests = normalizeThresholdTests(
          (row.threshold_tests ?? {}) as Record<
            string,
            {
              score?: number | null;
              time?: string | null;
              count?: number | null;
              pass?: boolean | null;
              datum?: string | null;
            }
          >,
        );
        const entry = tests[key] ?? (legacyKey ? tests[legacyKey] : null);
        if (!entry) continue;
        const hasValue =
          entry.score != null || entry.count != null || entry.time != null || entry.datum != null || entry.pass != null;
        if (hasValue) return entry;
      }
      return null;
    };

    return THRESHOLD_TESTS.map((test) => {
      const entry = latestEntry(test.key);
      let value: string | null = null;
      if (entry) {
        if (test.inputType === "time") value = entry.time ?? entry.datum ?? null;
        else if (test.inputType === "count") value = entry.count != null ? String(entry.count) : entry.datum ?? null;
        else value = entry.score != null ? String(entry.score) : entry.datum ?? null;
      }
      if (test.key === "mikraot_israel_1" && value == null) {
        const prep = byRecency(prepDays).find((row) => row.mikra_score != null);
        if (prep?.mikra_score != null) value = String(prep.mikra_score);
      }
      const group: "tests" | "fitness" =
        test.family === "fitness_run" || test.family === "fitness_strength" ? "fitness" : "tests";
      const pass =
        computeThresholdPass(test.key, {
          score: test.inputType === "score" && value != null ? Number(value) : entry?.score ?? null,
          time: test.inputType === "time" ? value : entry?.time ?? null,
          count: test.inputType === "count" && value != null ? Number(value) : entry?.count ?? null,
        }) ?? entry?.pass ?? null;
      return { key: test.key, label: test.label, value, pass, group };
    });
  }

  private documentsPayload(candidate: AgamCandidate, documents: AgamDocument[]) {
    const paperwork = documents.filter((document) => !isSportsResultsDocument(document));
    const required = requiredDocuments(candidate).map((doc) => {
      const file = paperwork.find((document) => documentMatchesType(document, doc.type)) ?? null;
      return {
        key: doc.key,
        type: doc.type,
        reason: doc.reason,
        uploaded: Boolean(file),
        approved: Boolean(file?.approved_at),
        documentId: file?.id ?? null,
        documentName: file?.name ?? null,
      };
    });
    return {
      required,
      uploaded: paperwork.map((document) => ({
        id: document.id,
        name: document.name,
        document_type: document.document_type,
        approved: Boolean(document.approved_at),
        created_at: document.created_at,
      })),
      docTypes: DOC_TYPES.filter((type) => type !== SPORTS_RESULTS_DOC_TYPE),
    };
  }
}
