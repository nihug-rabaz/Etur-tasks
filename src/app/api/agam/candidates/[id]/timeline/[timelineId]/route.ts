import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { assessmentCategoryLabel } from "@/modules/agam/lib/assessment-categories";

const noteSchema = z.object({
  description: z.string().trim().min(2),
  category: z.enum(["interview", "day_selection", "preparation_day", "smach", "other"]).default("other"),
});

async function authorize(
  candidateId: string,
  timelineId: string,
) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) return { error: access };

  const service = new AgamCandidateService();
  const note = await service.getTimelineItem(timelineId);
  if (!note || note.candidate_id !== candidateId || note.event_type !== "note") {
    return { error: { error: "Not found", status: 404 } };
  }

  const canChange = accessService.canRamad(access.role) || note.created_by_id === access.profile.id;
  if (!canChange) return { error: { error: "Forbidden", status: 403 } };

  return { access, service, note };
}

function rejectAuth(result: { error: { error: string; status: number } }) {
  return NextResponse.json({ error: result.error.error }, { status: result.error.status });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; timelineId: string }> },
) {
  const { id, timelineId } = await context.params;
  const authorized = await authorize(id, timelineId);
  if ("error" in authorized && authorized.error) {
    return rejectAuth(authorized as { error: { error: string; status: number } });
  }

  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  await authorized.service.updateTimelineItem(timelineId, {
    title: `הערכת צוות חדשה - ${assessmentCategoryLabel(parsed.data.category)}`,
    description: parsed.data.description,
    stage_key: parsed.data.category,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; timelineId: string }> },
) {
  const { id, timelineId } = await context.params;
  const authorized = await authorize(id, timelineId);
  if ("error" in authorized && authorized.error) {
    return rejectAuth(authorized as { error: { error: string; status: number } });
  }

  await authorized.service.deleteTimelineItem(timelineId);
  return NextResponse.json({ ok: true });
}
