import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { OneSignalService } from "@/services/onesignal.service";
import { OneSignalServerConfig } from "@/lib/onesignal/onesignal-server-config";

export async function GET() {
  const profile = await new AuthorizationService().getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new OneSignalService();
  const pushReady = OneSignalServerConfig.isSendReady()
    ? await service.hasPushSubscription(profile.id)
    : false;

  return NextResponse.json({
    configured: Boolean(OneSignalServerConfig.appId()),
    sendReady: OneSignalServerConfig.isSendReady(),
    pushReady,
    userId: profile.id,
  });
}
