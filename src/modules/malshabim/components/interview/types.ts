import type {
  MalshabimInstructionItem,
  MalshabimRequestMeta,
  MalshabimUpdateLogEntry,
} from "@/modules/malshabim/types";
import type { MalshabimQuizDraftQuestion } from "@/modules/malshabim/lib/question-bank";

export type ObservanceAnswer = {
  answer?: string;
  note?: string;
};

export type InstructionItem = MalshabimInstructionItem;

export type InterviewFormData = {
  id?: string;
  full_name: string | null;
  phone: string | null;
  id_number: string | null;
  personal_number: string | null;
  city: string | null;
  photo_url: string | null;
  candidate_status: string;
  advanced_status: string | null;
  status_type: string | null;
  request_type: string | null;
  recruitment_track: string | null;
  enlistment_date: string | null;
  interview_at: string | null;
  next_status_update_at: string | null;
  observance: Record<string, ObservanceAnswer>;
  quiz_questions: MalshabimQuizDraftQuestion[];
  quiz_score: number | null;
  quiz_passed: boolean;
  quiz_skipped: boolean;
  interview_summary: string | null;
  interviewer_notes: string | null;
  instructions: string | null;
  instruction_items: InstructionItem[];
  instruction_recipients: unknown[];
  is_draft: boolean;
  draft_step: number | null;
  update_log: MalshabimUpdateLogEntry[];
  serial_number?: number | null;
  interviewer_user_id: string | null;
  awaiting_admin_approval: boolean;
  request_meta: MalshabimRequestMeta;
};
