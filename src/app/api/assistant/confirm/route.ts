import { NextResponse } from "next/server";
import { z } from "zod";
import { AssistantAccessService } from "@/modules/assistant/services/access.service";
import { AssistantPendingStore } from "@/modules/assistant/lib/pending-store";
import { AssistantRateLimit } from "@/modules/assistant/lib/rate-limit";
import { executeAssistantTool } from "@/modules/assistant/tools/registry";
import { buildRequestOrigin } from "@/modules/assistant/tools/api-proxy";
import { AssistantAuditService } from "@/modules/assistant/services/audit.service";

const bodySchema = z.object({
  toolCallId: z.string().min(20).max(4000),
  approve: z.boolean(),
  pathname: z.string().min(1).max(500).default("/"),
  /** Required true when severity is destructive */
  acknowledgeDestructive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const access = await new AssistantAccessService().requireAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!AssistantRateLimit.check(access.profile.id, 40)) {
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

  const pending = AssistantPendingStore.take(parsed.data.toolCallId, access.profile.id);
  if (!pending) {
    return NextResponse.json({ error: "Pending action not found" }, { status: 404 });
  }

  if (!parsed.data.approve) {
    await new AssistantAuditService().record({
      userId: access.profile.id,
      toolName: pending.name,
      severity: pending.severity ?? "normal",
      label: pending.label,
      args: pending.args,
      resultOk: false,
      summary: "בוטל ע״י המשתמש",
    });
    return NextResponse.json({
      ok: true,
      cancelled: true,
      bubbles: ["סבבה", "ביטלתי"],
    });
  }

  if (pending.severity === "destructive" && !parsed.data.acknowledgeDestructive) {
    return NextResponse.json(
      {
        error: "פעולה הרסנית — נדרש אישור נוסף",
        requiresDestructiveAck: true,
      },
      { status: 400 },
    );
  }

  const result = await executeAssistantTool(
    pending.name,
    pending.args,
    {
      profile: access.profile,
      access: access.access,
      pathname: parsed.data.pathname,
      cookieHeader: request.headers.get("cookie") ?? "",
      origin: buildRequestOrigin(request),
    },
    { confirmed: true },
  );

  await new AssistantAuditService().record({
    userId: access.profile.id,
    toolName: pending.name,
    severity: pending.severity ?? result.severity ?? "normal",
    label: pending.label,
    method: typeof pending.args.method === "string" ? pending.args.method : null,
    path: typeof pending.args.path === "string" ? pending.args.path : pending.href ?? null,
    args: pending.args,
    beforeSnapshot: result.beforeSnapshot ?? null,
    afterSnapshot: result.data ?? null,
    resultOk: result.ok,
    summary: result.summary,
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: result.summary,
      bubbles: ["אופס", result.summary],
    });
  }

  const bubbles = result.navigate
    ? ["יאללה", `עוברים ל${result.navigate.label}`]
    : ["בוצע", result.summary.slice(0, 80)];

  return NextResponse.json({
    ok: true,
    navigate: result.navigate ?? null,
    summary: result.summary,
    data: result.data ?? null,
    auditKept: true,
    bubbles,
  });
}
