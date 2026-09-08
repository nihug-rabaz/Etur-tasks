import type { NagadimPipelineStage, NagadimStageEvent } from "@/modules/nagadim/types";

export const PIPELINE_STAGES: NagadimPipelineStage[] = [
  "מוקד איתור",
  "בדיקת סגל",
  "ראיון פרויקטור נגדים",
  "בדיקת עומק",
  "ראיון פיקודים ויחידות",
];

export const DEFAULT_STAGE: NagadimPipelineStage = PIPELINE_STAGES[0];

export function isPipelineStage(value: string | null | undefined): value is NagadimPipelineStage {
  return Boolean(value && (PIPELINE_STAGES as string[]).includes(value));
}

export function latestEventForStage(
  events: NagadimStageEvent[],
  stage: string,
): NagadimStageEvent | null {
  const forStage = events.filter((event) => event.stage === stage);
  if (!forStage.length) return null;
  return forStage.reduce((latest, event) => {
    const latestKey = `${latest.event_date ?? ""}|${latest.created_at}`;
    const eventKey = `${event.event_date ?? ""}|${event.created_at}`;
    return eventKey >= latestKey ? event : latest;
  });
}

export function formatEventCell(event: NagadimStageEvent | null): string {
  if (!event) return "—";
  const parts = [
    event.person_name,
    event.event_date
      ? new Date(`${event.event_date}T00:00:00`).toLocaleDateString("he-IL")
      : null,
    event.command,
    event.unit,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : event.notes?.trim() || "נרשם";
}
