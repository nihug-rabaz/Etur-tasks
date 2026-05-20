import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { TelegramService } from "@/services/telegram.service";

export async function POST(request: Request) {
  const authz = new AuthorizationService();
  const profile = await authz.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Missing message text" }, { status: 400 });
  }
  const telegram = new TelegramService();
  if (!telegram.hasToken()) {
    return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 503 });
  }
  const sent = await telegram.broadcastToLinkedUsers(text.slice(0, 4000));
  return NextResponse.json({ ok: true, sent });
}
