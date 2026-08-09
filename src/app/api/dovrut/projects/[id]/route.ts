import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutProjectService } from "@/modules/dovrut/services/project.service";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  target_audiences: z.array(z.string()).optional(),
  status: z.enum(["active", "completed", "on_hold"]).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const project = await new DovrutProjectService().getById(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (access.role === "approver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const project = await new DovrutProjectService().update(id, parsed.data);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new DovrutAccessService().requireDovrutAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const ok = await new DovrutProjectService().delete(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
