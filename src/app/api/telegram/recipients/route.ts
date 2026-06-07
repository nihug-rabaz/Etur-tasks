import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { TelegramService } from "@/services/telegram.service";

export async function GET() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const telegramService = new TelegramService();
  if (!telegramService.hasToken()) {
    return NextResponse.json({ error: "Telegram bot not configured" }, { status: 503 });
  }

  const recipients = await telegramService.getDirectRecipients();
  return NextResponse.json({ recipients });
}
