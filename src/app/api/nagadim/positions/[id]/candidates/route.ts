import { NextResponse } from "next/server";
import { z } from "zod";
import { isPositionDecision, MAX_POSITION_CANDIDATES } from "@/modules/nagadim/lib/decisions";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";
import { NagadimPositionService } from "@/modules/nagadim/services/position.service";

const postSchema = z.object({
  full_name: z.string().min(1),
  decision: z.string().optional().nullable(),
  sort_order: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1).optional(),
  decision: z.string().optional().nullable(),
  sort_order: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new NagadimAccessService().requireNagadimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  if (parsed.data.decision != null && !isPositionDecision(parsed.data.decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  try {
    const position = await new NagadimPositionService().addCandidate(id, {
      full_name: parsed.data.full_name.trim(),
      decision: parsed.data.decision ?? null,
      sort_order: parsed.data.sort_order ?? undefined,
      notes: parsed.data.notes ?? null,
    });
    if (!position) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ position }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MAX_CANDIDATES:")) {
      return NextResponse.json(
        { error: `ניתן להוסיף עד ${MAX_POSITION_CANDIDATES} מועמדים לתקן` },
        { status: 400 },
      );
    }
    throw error;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new NagadimAccessService().requireNagadimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  if (parsed.data.decision != null && !isPositionDecision(parsed.data.decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const position = await new NagadimPositionService().updateCandidate(id, parsed.data.id, {
    full_name: parsed.data.full_name,
    decision: parsed.data.decision,
    sort_order: parsed.data.sort_order ?? undefined,
    notes: parsed.data.notes,
  });
  if (!position) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ position });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new NagadimAccessService().requireNagadimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const position = await new NagadimPositionService().deleteCandidate(id, parsed.data.id);
  if (!position) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ position });
}
