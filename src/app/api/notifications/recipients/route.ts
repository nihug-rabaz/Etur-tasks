import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { OneSignalService } from "@/services/onesignal.service";
import { OneSignalServerConfig } from "@/lib/onesignal/onesignal-server-config";
import { UserService } from "@/services/user.service";

export async function GET() {
  const profile = await new AuthorizationService().getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!OneSignalServerConfig.isSendReady()) {
    return NextResponse.json({ error: "OneSignal not configured" }, { status: 503 });
  }

  const service = new OneSignalService();
  const allUsers = await new UserService().getUsers();
  const approvedUsers = allUsers.filter((user) => user.is_approved);
  const recipients = await Promise.all(
    approvedUsers.map(async (user) => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      pushReady: await service.hasPushSubscription(user.id),
    })),
  );

  return NextResponse.json({ recipients });
}
