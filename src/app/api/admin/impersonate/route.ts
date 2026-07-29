import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { ImpersonationService } from "@/services/impersonation.service";

const startSchema = z.object({
  userId: z.string().uuid(),
});

export async function GET() {
  const authorizationService = new AuthorizationService();
  const actor = await authorizationService.getRealProfile();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (actor.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await new ImpersonationService().getSnapshot();
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  const authorizationService = new AuthorizationService();
  const actor = await authorizationService.ensureAdmin();

  const json = await request.json().catch(() => null);
  const parsed = startSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    const snapshot = await new ImpersonationService().start(actor.id, parsed.data.userId);
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to impersonate";
    const status =
      message === "Forbidden" ? 403 : message === "User not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  const authorizationService = new AuthorizationService();
  const actor = await authorizationService.ensureAdmin();

  try {
    const snapshot = await new ImpersonationService().stop(actor.id);
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stop impersonation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
