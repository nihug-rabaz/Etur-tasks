import { NextResponse } from "next/server";
import { NotificationImageService } from "@/services/notification-image.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const media = await new NotificationImageService().getMedia(id);
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(media.bytes), {
    status: 200,
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      "Content-Length": String(media.bytes.length),
    },
  });
}
