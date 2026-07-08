import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { AppSettingsService } from "@/services/app-settings.service";

export async function GET() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const appearance = await new AppSettingsService().getDomainTabAppearance();
  return NextResponse.json({ appearance });
}
