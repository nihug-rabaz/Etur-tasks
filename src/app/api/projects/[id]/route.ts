import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { ProjectService } from "@/services/project.service";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const projectService = new ProjectService();
  const project = await projectService.getOne(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await authorizationService.canAccessSubtopic(profile.id, project.subtopic_id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await projectService.delete(id);
  return NextResponse.json({ ok: true });
}
