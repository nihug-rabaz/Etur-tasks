import { NextResponse } from "next/server";
import { z } from "zod";
import { AssistantAccessService } from "@/modules/assistant/services/access.service";
import { AssistantAgentService } from "@/modules/assistant/services/agent.service";
import { AssistantRateLimit } from "@/modules/assistant/lib/rate-limit";
import type { AssistantChatMessage } from "@/modules/assistant/lib/protocol";
import { buildRequestOrigin } from "@/modules/assistant/tools/api-proxy";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
  pathname: z.string().min(1).max(500).default("/"),
});

export async function POST(request: Request) {
  const access = await new AssistantAccessService().requireAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!AssistantRateLimit.check(access.profile.id)) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const sanitized: AssistantChatMessage[] = [];
  for (const message of parsed.data.messages) {
    if (message.role === "user") {
      sanitized.push({ role: "user", content: message.content.trim() });
    } else if (message.role === "assistant") {
      const content = message.content.trim();
      if (content.startsWith("{") && content.includes("tool_calls")) continue;
      sanitized.push({ role: "assistant", content: content.slice(0, 1500) });
    }
  }
  if (sanitized.length === 0 || sanitized[sanitized.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
  }

  const stream = new AssistantAgentService().createChatStream({
    messages: sanitized.slice(-30),
    pathname: parsed.data.pathname,
    access,
    cookieHeader: request.headers.get("cookie") ?? "",
    origin: buildRequestOrigin(request),
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
