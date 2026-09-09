import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { AppSettingsService } from "@/services/app-settings.service";
import { ASSISTANT_PREVIEW_EMAIL } from "@/modules/assistant/services/access.service";
import { AssistantSchemaService } from "@/modules/assistant/services/schema.service";

export async function GET() {
  try {
    const profile = await new AuthorizationService().ensureAdmin();
    const email = (profile.email ?? "").trim().toLowerCase();
    const isPreview = email === ASSISTANT_PREVIEW_EMAIL;
    if (isPreview) {
      await new AssistantSchemaService().ensure();
    }
    const released = await new AppSettingsService().getAssistantReleased();
    return NextResponse.json({
      released,
      previewEmail: ASSISTANT_PREVIEW_EMAIL,
      canRelease: !released && isPreview,
      actorEmail: profile.email ?? null,
      schemaOk: isPreview,
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST() {
  try {
    const profile = await new AuthorizationService().ensureAdmin();
    const email = (profile.email ?? "").trim().toLowerCase();
    if (email !== ASSISTANT_PREVIEW_EMAIL) {
      return NextResponse.json(
        { error: "רק המשתמש המורשה יכול לשחרר את העוזר" },
        { status: 403 },
      );
    }

    await new AssistantSchemaService().ensure();
    const result = await new AppSettingsService().releaseAssistant();
    return NextResponse.json({
      ok: true,
      released: result.released,
      already: result.already,
      message: result.already
        ? "העוזר כבר שוחרר לכלל המנהלים והרמד"
        : "העוזר שוחרר לכלל המנהלים והרמד",
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
