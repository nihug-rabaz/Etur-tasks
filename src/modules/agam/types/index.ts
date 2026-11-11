export type AgamCandidateStatus = "pending" | "passed" | "not_passed";
export type AgamRankColor = "green" | "orange" | "red";

export type AgamQuestionType = "pre_screening" | "interview";

export type AgamFieldType = "text" | "number" | "select" | "textarea" | "date";

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

export interface AgamRankingRow {
  id: string;
  full_name: string;
  personal_number: string;
  status: AgamCandidateStatus;
  planning_index: number | null;
  dapar: number | null;
  cycle_rank: number | null;
  day_average: number | null;
  prep_average: number | null;
  smach_average: number | null;
}

export interface AgamCandidate {
  id: string;
  full_name: string;
  personal_number: string;
  phone: string | null;
  email: string | null;
  linked_user_id: string | null;
  command: string | null;
  direct_commander_name: string | null;
  direct_commander_role: string | null;
  gaps: string | null;
  exemptions: string | null;
  km: string | null;
  planning_index: number | null;
  dapar: number | null;
  remaining_cycles: string | null;
  release_date: string | null;
  cycle_bahad1_date?: string | null;
  cycle_rank: number | null;
  cycle_rank_total?: number;
  kahas: number | null;
  tash: number | null;
  rank_color: AgamRankColor | null;
  needs_sakmar: boolean | null;
  mabdak_approval: boolean | null;
  medical_issue: boolean | null;
  internet_test: boolean | null;
  pre_bahad1_checklist: Record<string, boolean>;
  questionnaire_data: Record<string, unknown> | null;
  status: AgamCandidateStatus;
  ramad_notes: string | null;
  archived: boolean;
  cycle_id: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  cycle_name?: string | null;
}

export type AgamTrackStageState = "pending" | "current" | "done";

export interface AgamTrackStage {
  key: AgamStageKey;
  name: string;
  description: string;
  state: AgamTrackStageState;
}

export interface AgamCycle {
  id: string;
  name: string;
  cycle_date: string;
  cohort_year: number | null;
  archived: boolean;
  notes: string | null;
  invite_slug: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  candidate_count?: number;
  schedule?: AgamCycleSchedule | null;
}

export type AgamCycleScheduleKey =
  | "selection_day"
  | "fitness_test"
  | "prep_day"
  | "fitness_theory_test"
  | "smach_start"
  | "smach_mikra"
  | "smach_weapon"
  | "smach_run"
  | "smach_pushups"
  | "smach_end"
  | "bahad1_intake";

/** Per-cycle schedule dates (YYYY-MM-DD); missing keys mean "no date yet". */
export type AgamCycleSchedule = Partial<Record<AgamCycleScheduleKey, string | null>>;

export type AgamDashboardEventType =
  | "hasbara"
  | "selection_day"
  | "fitness_test"
  | "prep_day"
  | "theory_test"
  | "smach"
  | "smach_test"
  | "mabdak"
  | "bahad1"
  | "general";

export interface AgamTimelineTemplate {
  id: string;
  title: string;
  event_type: AgamDashboardEventType;
  day_offset: number;
  notes: string | null;
  sort_order: number;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgamTimelineEventItem {
  id: string;
  title: string;
  event_date: string | null;
  event_type: AgamDashboardEventType;
  notes: string | null;
  sort_order?: number;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  cycle_id?: string | null;
  is_template?: boolean;
  template_id?: string | null;
  day_offset?: number | null;
  schedule_key?: AgamCycleScheduleKey | null;
}

export interface AgamLinkedTask {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "in_progress" | "completed";
  due_date: string | Date | null;
  created_by: string;
  agam_candidate_id: string | null;
  agam_cycle_id: string | null;
  cycle_name?: string | null;
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
  passed: boolean | null;
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
  passed: boolean | null;
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
  passed: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface AgamInterview {
  id: string;
  candidate_id: string;
  evaluator_id: string | null;
  evaluator_name: string | null;
  interview_data: Record<string, unknown> | null;
  candidate_part: Record<string, unknown> | null;
  candidate_part_completed_at: string | null;
  evaluator_part_completed_at: string | null;
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
  is_staff_only?: boolean;
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
  file_size: number | null;
  content_type: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
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
  created_by_id: string | null;
  created_at: string;
}

export interface AgamStageSummary {
  text: string;
  detail?: string;
}

export interface AgamCycleStageBoard {
  dayEvaluations: AgamDayEvaluation[];
  interviews: AgamInterview[];
  prepDays: AgamPrepDayEvaluation[];
  smach: AgamSmachEvaluation[];
  documents: Omit<AgamDocument, "file_url">[];
}
