import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutSignalService } from "@/modules/dovrut/services/signal.service";

const schema = z.object({
  recipient: z.string().min(1),
  text: z.string().min(1),
});

export async function GET() {
  const access = await new DovrutAccessService().requireDovrutAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const service = new DovrutSignalService();
  return NextResponse.json({ configured: service.isConfigured() });
}

export async function POST(request: Request) {
  const access = await new DovrutAccessService().requireDovrutAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const result = await new DovrutSignalService().sendMessage(
    parsed.data.recipient,
    parsed.data.text,
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 501 });
}
