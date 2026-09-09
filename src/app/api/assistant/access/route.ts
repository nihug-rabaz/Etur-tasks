import { NextResponse } from "next/server";
import { AssistantAccessService } from "@/modules/assistant/services/access.service";
import { ASSISTANT_DISPLAY_NAME } from "@/modules/assistant/lib/protocol";

export async function GET() {
  const access = await new AssistantAccessService().requireAccess();
  if (!access.ok) {
    return NextResponse.json(
      { allowed: false, error: access.error },
      { status: access.status },
    );
  }

  return NextResponse.json({
    allowed: true,
    displayName: ASSISTANT_DISPLAY_NAME,
    isPlatformAdmin: access.isPlatformAdmin,
    moduleRoles: access.moduleRoles,
  });
}
