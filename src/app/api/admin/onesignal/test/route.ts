import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { OneSignalService } from "@/services/onesignal.service";
import { OneSignalServerConfig } from "@/lib/onesignal/onesignal-server-config";
import { UserService } from "@/services/user.service";

const bodySchema = z.object({
  userId: z.string().uuid(),
});

export async function GET() {
  const profile = await new AuthorizationService().ensureRealAdminApi();
  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = new OneSignalService();
  const allUsers = await new UserService().getUsers();
  const approvedUsers = allUsers.filter((user) => user.is_approved);
  const users = await Promise.all(
    approvedUsers.map(async (user) => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      pushReady: await service.hasPushSubscription(user.id),
    })),
  );
  return NextResponse.json({
    configured: Boolean(OneSignalServerConfig.appId()),
    sendReady: OneSignalServerConfig.isSendReady(),
    currentUserId: profile.id,
    users,
  });
}

export async function POST(request: Request) {
  const profile = await new AuthorizationService().ensureRealAdminApi();
  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!OneSignalServerConfig.isSendReady()) {
    return NextResponse.json({ error: "ONESIGNAL_REST_API_KEY missing" }, { status: 503 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    const result = await new OneSignalService().sendTestPush(parsed.data.userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    const status =
      message === "MISSING_REST_API_KEY" ? 503 : message === "USER_NOT_SUBSCRIBED" ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
