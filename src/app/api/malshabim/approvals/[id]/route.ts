import { NextResponse } from "next/server";
import { z } from "zod";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

const postSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new MalshabimAccessService().requireMalshabimAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const service = new MalshabimCandidateService();
  const existing = await service.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const approved = parsed.data.action === "approve";
  const status = approved ? "אושר" : "בטיפול";
  const logEntry = {
    date: new Date().toISOString(),
    changes: approved ? "אישור מנהל" : "דחיית אישור מנהל",
    updated_by: access.profile.name,
  };

  const candidate = await service.update(id, {
    awaiting_admin_approval: false,
    candidate_status: status,
    update_log: [...(existing.update_log || []), logEntry],
  });

  return NextResponse.json({ candidate });
}
