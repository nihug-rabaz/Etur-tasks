import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutProjectService } from "@/modules/dovrut/services/project.service";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  target_audiences: z.array(z.string()).optional(),
  status: z.enum(["active", "completed", "on_hold"]).optional(),
});

export async function GET() {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const projects = await new DovrutProjectService().list();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (access.role === "approver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const project = await new DovrutProjectService().create({
    ...parsed.data,
    created_by: access.profile.id,
  });
  return NextResponse.json({ project }, { status: 201 });
}
