import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { OneSignalService } from "@/services/onesignal.service";
import { OneSignalServerConfig } from "@/lib/onesignal/onesignal-server-config";

const broadcastSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(4000),
  url: z.string().url().optional(),
});

export async function POST(request: Request) {
  const profile = await new AuthorizationService().getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = broadcastSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  if (!OneSignalServerConfig.isSendReady()) {
    return NextResponse.json({ error: "OneSignal not configured" }, { status: 503 });
  }

  const stats = await new OneSignalService().broadcastToSubscribedUsers(
    parsed.data.message,
    parsed.data.url,
  );
  return NextResponse.json({ ok: true, ...stats });
}
