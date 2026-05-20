import { NextResponse } from "next/server";
import { TelegramService } from "@/services/telegram.service";
import { Env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const expectedSecret = Env.get("TELEGRAM_WEBHOOK_SECRET");
  if (expectedSecret) {
    const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  const telegram = new TelegramService();
  if (!telegram.hasToken()) {
    return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as Parameters<TelegramService["processUpdate"]>[0] | null;
  if (!body) {
    return NextResponse.json({ ok: true });
  }
  try {
    await telegram.processUpdate(body);
  } catch (error) {
    console.error("[telegram-webhook]", error);
  }
  return NextResponse.json({ ok: true });
}
