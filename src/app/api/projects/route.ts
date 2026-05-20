import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { NeonDatabase } from "@/lib/db/neon";

const projectSchema = z.object({
  name: z.string().min(1),
  subtopicId: z.string().uuid(),
  description: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "archived"]).default("active"),
});

export async function POST(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = projectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const payload = parsed.data;
  if (profile.role !== "admin") {
    const allowed = await authorizationService.canAccessSubtopic(profile.id, payload.subtopicId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const db = NeonDatabase.createClient();
  const rows = await db<Array<{ id: string }>>`
    insert into projects (name, description, subtopic_id, start_date, end_date, status)
    values (
      ${payload.name},
      ${payload.description ?? null},
      ${payload.subtopicId},
      ${payload.startDate ?? null},
      ${payload.endDate ?? null},
      ${payload.status}
    )
    returning id
  `;

  return NextResponse.json({ id: rows[0]?.id });
}
