import { base44 } from '@/api/base44Client';

// Best-effort timeline logging. Never throws to avoid breaking the calling flow.
export async function addTimelineEvent({ candidate_id, event_type, title, description = '', actor_name = '', stage_key = '' }) {
  if (!candidate_id || !event_type || !title) return;
  try {
    await base44.entities.CandidateTimeline.create({
      candidate_id,
      event_type,
      title,
      description,
      actor_name,
      stage_key,
    });
  } catch {
    /* timeline is best-effort */
  }
}