import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { TaskMessageService } from "@/services/task-message.service";

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await context.params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const allowed = await authorizationService.canAccessTask(profile, taskId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await new TaskMessageService().listByTask(taskId);
  return NextResponse.json({ messages, currentUserId: profile.id });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await context.params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const allowed = await authorizationService.canAccessTask(profile, taskId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    const message = await new TaskMessageService().create(taskId, profile.id, parsed.data.body);
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }
}
