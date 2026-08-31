import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamTaskLinkService } from "@/modules/agam/services/task-link.service";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().optional().nullable(),
  candidateId: z.string().uuid().optional().nullable(),
  cycleId: z.string().uuid().optional().nullable(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["in_progress", "completed"]).optional(),
});

function canManageTask(ownerId: string, actorId: string, role: string): boolean {
  return ownerId === actorId || role === "admin" || role === "ramad";
}

export async function GET(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const url = new URL(request.url);
  const tasks = await new AgamTaskLinkService().list({
    candidateId: url.searchParams.get("candidateId"),
    cycleId: url.searchParams.get("cycleId"),
    includeGeneral: url.searchParams.get("general") === "1",
  });
  return NextResponse.json({ tasks, role: access.role });
}

export async function POST(request: Request) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  try {
    const task = await new AgamTaskLinkService().create({
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      due_date: parsed.data.dueDate,
      candidate_id: parsed.data.candidateId,
      cycle_id: parsed.data.cycleId,
      created_by: access.profile.id,
    });
    if (parsed.data.candidateId) {
      await new AgamCandidateService().addTimeline({
        candidate_id: parsed.data.candidateId,
        event_type: "note",
        title: `נוצרה משימה: ${parsed.data.title}`,
        actor_name: access.profile.name,
      });
    }
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "AGAM_SUBTOPIC_MISSING") {
      return NextResponse.json({ error: "לא נמצא תת-נושא למשימות אג״ם" }, { status: 500 });
    }
    return NextResponse.json({ error: "יצירת משימה נכשלה" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const service = new AgamTaskLinkService();
  const existing = await service.getById(parsed.data.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTask(existing.created_by, access.profile.id, access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const task = await service.update({
    id: parsed.data.id,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    due_date: parsed.data.dueDate,
    status: parsed.data.status,
  });
  return NextResponse.json({ task });
}

export async function DELETE(request: Request) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing" }, { status: 400 });
  const service = new AgamTaskLinkService();
  const existing = await service.getById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTask(existing.created_by, access.profile.id, access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await service.delete(id);
  return NextResponse.json({ ok: true });
}
