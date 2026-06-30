export type UserRole = "admin" | "user";
export type ProjectStatus = "active" | "completed" | "archived";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "in_progress" | "completed";

export interface Profile {
  id: string;
  name: string;
  email?: string | null;
  role: UserRole;
  telegram_id: string | null;
  telegram_username?: string | null;
  telegram_linked_at?: string | null;
  avatar: string | null;
  is_approved: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at: string;
}

export interface TelegramLinkCode {
  code: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface Domain {
  id: string;
  name: string;
  slug: string;
}

export interface Subtopic {
  id: string;
  name: string;
  domain_id: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  subtopic_id: string;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  subtopic_id: string;
  project_id: string | null;
  assigned_to: string | null;
  created_by: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  subtopic_name?: string;
  domain_name?: string;
  project_name?: string;
  assignee_name?: string;
  assignee_ids?: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  subtopic_id: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  created_by: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventWithRelations extends CalendarEvent {
  subtopic_name?: string;
  domain_name?: string;
  participant_name?: string;
  participant_ids?: string[];
}
