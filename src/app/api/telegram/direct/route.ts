import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { TelegramService } from "@/services/telegram.service";

const directSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "At least one recipient is required"),
  message: z.string().trim().min(1, "Message is required").max(4000),
});

export async function POST(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = directSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const telegramService = new TelegramService();
  if (!telegramService.hasToken()) {
    return NextResponse.json({ error: "Telegram bot not configured" }, { status: 503 });
  }

  const stats = await telegramService.sendDirectMessages(parsed.data.userIds, parsed.data.message);
  return NextResponse.json({ ok: true, ...stats });
}
