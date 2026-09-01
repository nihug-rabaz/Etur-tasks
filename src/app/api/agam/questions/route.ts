import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamQuestionService } from "@/modules/agam/services/question.service";

const bodySchema = z.object({
  id: z.string().uuid().optional(),
  question_type: z.enum(["pre_screening", "interview"]),
  section_number: z.number(),
  section_name: z.string().nullable(),
  question_text: z.string().min(1),
  field_key: z.string().min(1),
  field_type: z.enum(["text", "number", "select", "textarea"]),
  options: z.string().nullable().optional(),
  is_required: z.boolean(),
  condition_field: z.string().nullable().optional(),
  condition_operator: z.enum(["eq", "neq", "gt", "lt", "gte", "lte"]).nullable().optional(),
  condition_value: z.string().nullable().optional(),
  sort_order: z.number(),
  is_active: z.boolean(),
});

export async function GET() {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canRamad(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const questions = await new AgamQuestionService().listAll();
  return NextResponse.json({ questions });
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
  const payload = {
    question_type: parsed.data.question_type,
    section_number: parsed.data.section_number,
    section_name: parsed.data.section_name,
    question_text: parsed.data.question_text,
    field_key: parsed.data.field_key,
    field_type: parsed.data.field_type,
    options: parsed.data.options ?? null,
    is_required: parsed.data.is_required,
    condition_field: parsed.data.condition_field ?? null,
    condition_operator: parsed.data.condition_operator ?? "eq",
    condition_value: parsed.data.condition_value ?? null,
    sort_order: parsed.data.sort_order,
    is_active: parsed.data.is_active,
  };
  const service = new AgamQuestionService();
  if (parsed.data.id) await service.update(parsed.data.id, payload);
  else await service.create(payload);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing" }, { status: 400 });
  await new AgamQuestionService().delete(id);
  return NextResponse.json({ ok: true });
}
