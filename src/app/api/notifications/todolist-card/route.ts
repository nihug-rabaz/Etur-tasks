import { NextResponse } from "next/server";

/** Legacy route — rich push now uses pre-rendered /api/notifications/media/:id. */
export async function GET() {
  return NextResponse.json(
    { error: "Use pre-rendered media URLs from NotificationImageService" },
    { status: 410 },
  );
}
