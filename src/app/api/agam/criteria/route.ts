import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCriterionService } from "@/modules/agam/services/evaluation.service";

const bodySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  key: z.string().min(1),
  bullets: z.string().nullable(),
  weight: z.number(),
  sort_order: z.number(),
  is_active: z.boolean(),
});

export async function GET() {
  const access = await new AgamAccessService().requireAgamAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const criteria = await new AgamCriterionService().listAll();
  return NextResponse.json({ criteria });
}

export async function POST(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const service = new AgamCriterionService();
  if (parsed.data.id) await service.update(parsed.data.id, parsed.data);
  else await service.create(parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing" }, { status: 400 });
  await new AgamCriterionService().delete(id);
  return NextResponse.json({ ok: true });
}
