import { NextResponse } from "next/server";
import { z } from "zod";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimWaitlistService } from "@/modules/malshabim/services/waitlist.service";
import { NotificationService } from "@/services/notification.service";

export async function GET() {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const service = new MalshabimWaitlistService();
  const [entries, count] = await Promise.all([service.list(), service.count()]);
  return NextResponse.json({
    entries,
    count,
    role: access.role,
    currentUserId: access.profile.id,
  });
}

const createSchema = z.object({
  full_name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const access = await new MalshabimAccessService().requireMalshabimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  const digitsOnly = parsed.data.phone.replace(/\D/g, "");
  if (!digitsOnly) {
    return NextResponse.json({ error: "מספר טלפון חייב להכיל ספרות בלבד" }, { status: 400 });
  }
  const entry = await new MalshabimWaitlistService().create({
    full_name: parsed.data.full_name,
    phone: digitsOnly,
    created_by: access.profile.id,
  });
  try {
    await new NotificationService().notifyMalshabimWaitlistCreated({
      entryId: entry.id,
      fullName: entry.full_name,
      phone: entry.phone,
      createdByName: access.profile.name || "משתמש",
    });
  } catch {
    // Creating the inquiry must succeed even if push fails.
  }
  return NextResponse.json({ entry }, { status: 201 });
}
