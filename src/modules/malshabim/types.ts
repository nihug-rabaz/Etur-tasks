export type MalshabimCandidateStatus = "חדש" | "ממתין לעדכון" | "בטיפול" | "הושלם";

export type MalshabimAdvancedStatus =
  | "בטיפול"
  | "הסתיים טיפול"
  | "בהמתנה"
  | "אושר"
  | "לא אושר";

export interface MalshabimUpdateLogEntry {
  date?: string | null;
  changes?: string | null;
  updated_by?: string | null;
  [key: string]: unknown;
}

export interface MalshabimQuizQuestion {
  question?: string | null;
  answer?: string | null;
  is_correct?: boolean;
  [key: string]: unknown;
}

export interface MalshabimCandidate {
  id: string;
  legacy_base44_id: string | null;
  full_name: string | null;
  phone: string | null;
  id_number: string | null;
  personal_number: string | null;
  serial_number: number | null;
  city: string | null;
  photo_url: string | null;
  candidate_status: string;
  advanced_status: string;
  status_type: string | null;
  request_type: string | null;
  recruitment_track: string | null;
  enlistment_date: string | null;
  interview_at: string | null;
  next_status_update_at: string | null;
  observance: Record<string, unknown>;
  quiz_questions: MalshabimQuizQuestion[];
  quiz_score: number | null;
  quiz_passed: boolean;
  quiz_skipped: boolean;
  interview_summary: string | null;
  interviewer_notes: string | null;
  instructions: string | null;
  instruction_items: unknown[];
  instruction_recipients: unknown[];
  is_draft: boolean;
  draft_step: number | null;
  update_log: MalshabimUpdateLogEntry[];
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type MalshabimCandidateWrite = Partial<
  Omit<MalshabimCandidate, "id" | "created_at" | "updated_at">
>;
