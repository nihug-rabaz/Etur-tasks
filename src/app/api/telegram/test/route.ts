import { NextResponse } from "next/server";
import { resolveAuthenticatedUserId } from "@/lib/auth/session-user";
import { TelegramService } from "@/services/telegram.service";

export async function POST(request: Request) {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let customText: string | undefined;
  try {
    const body = (await request.json().catch(() => null)) as { text?: string } | null;
    if (body?.text && typeof body.text === "string") {
      customText = body.text.trim().slice(0, 1000);
    }
  } catch {
    customText = undefined;
  }
  const message =
    customText || "התראת בדיקה מ-TaskFlow Orbit. החיבור פעיל ועובד כמו שצריך.";
  const telegram = new TelegramService();
  if (!telegram.hasToken()) {
    return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 503 });
  }
  const sent = await telegram.sendToUser(userId, message);
  if (!sent) {
    return NextResponse.json({ error: "Account is not linked to Telegram" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
