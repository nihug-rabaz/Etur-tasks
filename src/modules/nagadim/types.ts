export type NagadimPipelineStage =
  | "מוקד איתור"
  | "בדיקת סגל"
  | "ראיון פרויקטור נגדים"
  | "בדיקת עומק"
  | "ראיון פיקודים ויחידות";

export type NagadimPositionDecision =
  | "לא רצו אותו"
  | "לא רצה את התפקיד"
  | "גויס"
  | "במילואים בניסיון"
  | "אחר";

export type NagadimGapStatus = "open" | "closed" | "permanently_closed";

export interface NagadimCandidate {
  id: string;
  full_name: string;
  notes: string | null;
  current_stage: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NagadimStageEvent {
  id: string;
  candidate_id: string;
  stage: string;
  person_name: string | null;
  event_date: string | null;
  notes: string | null;
  command: string | null;
  unit: string | null;
  sort_order: number;
  created_at: string;
}

export interface NagadimCandidateWithEvents extends NagadimCandidate {
  stage_events: NagadimStageEvent[];
}

export interface NagadimPosition {
  id: string;
  command: string | null;
  division: string | null;
  brigade: string | null;
  unit: string | null;
  activity_level: string | null;
  gap_status: NagadimGapStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NagadimPositionCandidate {
  id: string;
  position_id: string;
  full_name: string;
  decision: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export interface NagadimPositionWithCandidates extends NagadimPosition {
  candidates: NagadimPositionCandidate[];
}

export type NagadimCandidateWrite = Partial<
  Omit<NagadimCandidate, "id" | "created_at" | "updated_at">
>;

export type NagadimStageEventWrite = Partial<
  Omit<NagadimStageEvent, "id" | "candidate_id" | "created_at">
> & { stage: string };

export type NagadimPositionWrite = Partial<
  Omit<NagadimPosition, "id" | "created_at" | "updated_at">
>;

export type NagadimPositionCandidateWrite = Partial<
  Omit<NagadimPositionCandidate, "id" | "position_id" | "created_at">
>;
