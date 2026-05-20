import { NextResponse } from "next/server";
import { resolveAuthenticatedUserId } from "@/lib/auth/session-user";
import { TelegramService } from "@/services/telegram.service";

export async function GET() {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const telegram = new TelegramService();
  const status = await telegram.getStatus(userId);
  return NextResponse.json(status);
}
