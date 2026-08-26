export type DovrutProjectStatus = "active" | "completed" | "on_hold" | "draft";

export type DovrutCampaignStatus = "active" | "completed" | "on_hold" | "draft";

export type DovrutConceptType = "article_interview" | "social_media";

export type DovrutDomain =
  | "kashrut"
  | "halacha"
  | "reut"
  | "tipuch"
  | "lehaka"
  | "zuq"
  | "masan"
  | "agam_hachsharot"
  | "logistic"
  | "field";

export type DovrutWorkStatus =
  | "planning"
  | "production"
  | "waiting_approvals"
  | "approved";

export type DovrutWorkStatusArticle = DovrutWorkStatus;
export type DovrutWorkStatusSocial = DovrutWorkStatus;

export type DovrutApprovalStatus =
  | "waiting_spokesperson_officer"
  | "waiting_branch_head"
  | "waiting_deputy_commander"
  | "waiting_chief_rabbi"
  | "waiting_command_rabbi"
  | "approved";

export type DovrutContentType = "carousel" | "video" | "image" | "reels" | "text";

export type DovrutActivityAction =
  | "created"
  | "updated"
  | "status_changed"
  | "approval_changed"
  | "deleted";

export interface DovrutCampaign {
  id: string;
  name: string;
  description: string | null;
  status: DovrutCampaignStatus;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DovrutProject {
  id: string;
  name: string;
  description: string | null;
  target_audiences: string[];
  status: DovrutProjectStatus;
  campaign_id: string | null;
  ended_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  campaign_name?: string | null;
}

export interface DovrutConcept {
  id: string;
  name: string;
  project_id: string;
  type: DovrutConceptType;
  domain: DovrutDomain | null;
  domains: DovrutDomain[];
  interviewees: string[];
  media_outlet: string | null;
  interviewer: string | null;
  needs_briefing: boolean;
  requires_chief_rabbi: boolean;
  requires_deputy_commander: boolean;
  requires_branch_head: boolean;
  target_audience: string | null;
  target_audiences: string[];
  link: string | null;
  details: string | null;
  notes: string | null;
  work_status_article: DovrutWorkStatusArticle | null;
  content_type: DovrutContentType | null;
  draft_text: string | null;
  draft_images: string[];
  draft_videos: string[];
  partners: string[];
  work_status_social: DovrutWorkStatusSocial | null;
  approval_status: DovrutApprovalStatus | null;
  rejection_reason: string | null;
  rejected_at_step: string | null;
  last_rejection_date: string | null;
  linked_task_id: string | null;
  is_draft: boolean;
  last_opened_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string;
}

export interface DovrutActivityLog {
  id: string;
  concept_id: string | null;
  project_id: string | null;
  action_type: DovrutActivityAction;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  details: string | null;
  user_name: string;
  user_email: string | null;
  created_at: string;
}

export interface DovrutAudienceMessage {
  id: string;
  audience: string;
  domain: DovrutDomain | null;
  title: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DovrutItem = DovrutConcept;

export interface DovrutInquirySubject {
  id: string;
  name: string;
  rank: string | null;
  age: number | null;
  birth_date: string | null;
  hometown: string | null;
  family_status: string | null;
  enlistment_year: number | null;
  years_in_role: number | null;
  role_started_at: string | null;
  role_title: string | null;
  previous_roles: string | null;
  bio: string;
  notes: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
