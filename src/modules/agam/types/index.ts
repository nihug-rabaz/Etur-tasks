export type AgamCandidateStatus = "pending" | "passed" | "not_passed";

export type AgamQuestionType = "pre_screening" | "interview";

export type AgamFieldType = "text" | "number" | "select" | "textarea";

export type AgamConditionOperator = "eq" | "neq" | "gt" | "lt" | "gte" | "lte";

export type AgamRecommendation = "ממליץ" | "ממליץ בהסתייגות" | "לא ממליץ";

export type AgamSmachDecision = "מומלץ" | "מומלץ בהסתייגות" | "לא מומלץ";

export type AgamUploadSource = "candidate" | "evaluator" | "ramad" | "admin";

export type AgamTimelineEvent =
  | "questionnaire"
  | "interview"
  | "evaluation"
  | "document"
  | "decision"
  | "stage_change"
  | "note";

export type AgamStageKey =
  | "day_selection"
  | "preparation_day"
  | "smach"
  | "documents"
  | "final_decision";

export interface AgamCandidate {
  id: string;
  full_name: string;
  personal_number: string;
  phone: string | null;
  questionnaire_data: Record<string, unknown> | null;
  status: AgamCandidateStatus;
  ramad_notes: string | null;
  archived: boolean;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgamOrgSettings {
  id: string;
  logo_url: string | null;
  unit_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgamCriterion {
  id: string;
  name: string;
  key: string;
  bullets: string | null;
  weight: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgamDayEvaluation {
  id: string;
  candidate_id: string;
  evaluator_id: string;
  evaluator_name: string | null;
  scores_data: Record<string, number> | null;
  feedback_data: Record<string, string> | null;
  final_score: number | null;
  final_feedback: string | null;
  weighted_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface AgamPrepDayEvaluation {
  id: string;
  candidate_id: string;
  evaluator_id: string;
  evaluator_name: string | null;
  mikra_score: number | null;
  conversation_score: number | null;
  conversation_feedback: string | null;
  social_dynamics_score: number | null;
  social_dynamics_feedback: string | null;
  general_impression: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgamSmachEvaluation {
  id: string;
  candidate_id: string;
  evaluator_id: string;
  evaluator_name: string | null;
  threshold_tests: Record<string, unknown> | null;
  professional_scores: Record<string, number> | null;
  professional_feedback: Record<string, string> | null;
  weighted_score: number | null;
  key_points: string | null;
  decision: AgamSmachDecision | null;
  decision_reasoning: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgamInterview {
  id: string;
  candidate_id: string;
  evaluator_id: string;
  evaluator_name: string | null;
  interview_data: Record<string, unknown> | null;
  evaluator_assessment: string | null;
  recommendation: AgamRecommendation | null;
  created_at: string;
  updated_at: string;
}

export interface AgamQuestion {
  id: string;
  question_type: AgamQuestionType;
  section_number: number;
  section_name: string | null;
  question_text: string;
  field_key: string;
  field_type: AgamFieldType;
  options: string | null;
  is_required: boolean;
  condition_field: string | null;
  condition_operator: AgamConditionOperator | null;
  condition_value: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgamDocument {
  id: string;
  candidate_id: string;
  name: string;
  file_url: string;
  document_type: string | null;
  upload_source: AgamUploadSource | null;
  notes: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgamTimelineItem {
  id: string;
  candidate_id: string;
  event_type: AgamTimelineEvent;
  title: string;
  description: string | null;
  actor_name: string | null;
  stage_key: string | null;
  created_at: string;
}

export interface AgamStageSummary {
  text: string;
  detail?: string;
}
