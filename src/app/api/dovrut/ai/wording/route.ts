import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutAiWordingService } from "@/modules/dovrut/services/ai-wording.service";

const schema = z.object({
  text: z.string().min(1),
  audience: z.string().optional(),
  channel: z.enum(["signal", "telegram", "generic"]).optional(),
});

export async function POST(request: Request) {
  const accessService = new DovrutAccessService();
  const access = await accessService.requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEditContent(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const result = await new DovrutAiWordingService().improve(parsed.data);
  return NextResponse.json(result);
}
