import { NextResponse } from "next/server";
import { resolveAuthenticatedUserId } from "@/lib/auth/session-user";
import { TelegramService } from "@/services/telegram.service";

export async function POST() {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const telegram = new TelegramService();
  if (!telegram.hasToken()) {
    return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 503 });
  }
  try {
    const result = await telegram.generateLinkCode(userId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate link code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const telegram = new TelegramService();
  await telegram.unlink(userId);
  return NextResponse.json({ ok: true });
}
