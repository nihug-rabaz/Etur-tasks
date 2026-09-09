import { buildAssistantPersonaPrompt } from "@/modules/assistant/lib/persona";
import { AssistantPendingStore } from "@/modules/assistant/lib/pending-store";
import {
  ASSISTANT_MAX_AGENT_ITERATIONS,
  type AssistantChatMessage,
  type AssistantSseEvent,
} from "@/modules/assistant/lib/protocol";
import type { AssistantAccessOk } from "@/modules/assistant/services/access.service";
import { AssistantLlmProvider } from "@/modules/assistant/services/llm.provider";
import { AssistantRagService } from "@/modules/assistant/services/rag.service";
import {
  ASSISTANT_TOOL_DEFINITIONS,
  executeAssistantTool,
  formatToolDescriptions,
  newToolCallId,
} from "@/modules/assistant/tools/registry";
import { resolveActiveModuleId } from "@/shared/modules/registry";

export type AssistantRunInput = {
  messages: AssistantChatMessage[];
  pathname: string;
  access: AssistantAccessOk;
  cookieHeader: string;
  origin: string;
};

function emit(controller: ReadableStreamDefaultController<Uint8Array>, event: AssistantSseEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export class AssistantAgentService {
  private readonly rag = new AssistantRagService();

  public createChatStream(input: AssistantRunInput): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          const pendingConfirmId = await this.runLoop(input, controller);
          emit(controller, { type: "done", pendingConfirmId });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "שגיאה לא ידועה";
          const friendly =
            message === "assistant_llm_not_configured"
              ? "אין מפתח LLM מוגדר (GEMINI/OPENAI)"
              : message === "assistant_llm_failed"
                ? "רגע, נתקעתי על התשובה. ננסה שוב?"
                : "משהו נתקע. ננסה שוב?";
          emit(controller, { type: "error", message: friendly });
          emit(controller, { type: "done" });
        } finally {
          controller.close();
        }
      },
    });
  }

  private async runLoop(
    input: AssistantRunInput,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): Promise<string | undefined> {
    if (!AssistantLlmProvider.isConfigured()) {
      throw new Error("assistant_llm_not_configured");
    }

    const activeModuleId = resolveActiveModuleId(input.pathname);
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    const knowledgeSnippets = this.rag.formatSnippets(
      [lastUser?.content ?? "", input.pathname, activeModuleId ?? ""].join(" "),
      3,
    );

    const system = buildAssistantPersonaPrompt({
      userName: input.access.profile.name,
      isPlatformAdmin: input.access.isPlatformAdmin,
      moduleRoles: Object.entries(input.access.moduleRoles)
        .map(([k, v]) => `${k}:${v}`)
        .join(", "),
      pathname: input.pathname,
      activeModuleId,
      knowledgeSnippets,
      toolDescriptions: formatToolDescriptions(),
    });

    const workingMessages: AssistantChatMessage[] = [...input.messages];
    const toolCtx = {
      profile: input.access.profile,
      access: input.access.access,
      pathname: input.pathname,
      cookieHeader: input.cookieHeader,
      origin: input.origin,
    };

    for (let i = 0; i < ASSISTANT_MAX_AGENT_ITERATIONS; i += 1) {
      let turn;
      try {
        turn = await AssistantLlmProvider.complete({
          system,
          messages: workingMessages,
        });
      } catch {
        if (i > 0) {
          emit(controller, { type: "bubble", text: "רגע, משהו נתקע לי באמצע" });
          const lastNote = workingMessages[workingMessages.length - 1]?.content ?? "";
          const summaryLine = lastNote
            .split("\n")
            .find((line) => line.startsWith("tool ") && line.includes("=> ok"));
          if (summaryLine) {
            const after = summaryLine.split("=> ok:")[1]?.trim();
            if (after) {
              emit(controller, { type: "bubble", text: after.slice(0, 120) });
            }
          }
          emit(controller, { type: "bubble", text: "נסה שוב במשפט קצר" });
          return undefined;
        }
        throw new Error("assistant_llm_failed");
      }

      for (const bubble of turn.bubbles) {
        emit(controller, { type: "bubble", text: bubble });
      }

      if (turn.toolCalls.length === 0) {
        if (turn.bubbles.length === 0) {
          emit(controller, { type: "bubble", text: "מה אומר?" });
        }
        return undefined;
      }

      const toolNotes: string[] = [];
      let pendingConfirmId: string | undefined;

      for (const call of turn.toolCalls) {
        const def = ASSISTANT_TOOL_DEFINITIONS.find((t) => t.name === call.name);
        if (!def) {
          emit(controller, {
            type: "tool_result",
            id: newToolCallId(),
            name: call.name,
            ok: false,
            summary: "כלי לא מוכר",
          });
          toolNotes.push(`tool ${call.name}: unknown`);
          continue;
        }

        const id = newToolCallId();
        emit(controller, {
          type: "tool_request",
          id,
          name: call.name,
          args: call.args,
          side: def.side,
        });

        if (def.side === "write") {
          const preview = await executeAssistantTool(call.name, call.args, toolCtx, {
            confirmed: false,
          });
          if (!preview.ok) {
            emit(controller, {
              type: "tool_result",
              id,
              name: call.name,
              ok: false,
              summary: preview.summary,
            });
            toolNotes.push(`tool ${call.name} failed: ${preview.summary}`);
            continue;
          }

          const pendingArgs =
            preview.data &&
            typeof preview.data === "object" &&
            !Array.isArray(preview.data) &&
            ("path" in (preview.data as object) || call.name === "navigate")
              ? call.name === "navigate"
                ? {
                    ...call.args,
                    ...(preview.navigate ? { href: preview.navigate.href } : {}),
                  }
                : (preview.data as Record<string, unknown>)
              : {
                  ...call.args,
                  ...(preview.navigate ? { href: preview.navigate.href } : {}),
                };

          const severity = preview.severity ?? "normal";

          const token = AssistantPendingStore.put({
            id,
            userId: input.access.profile.id,
            name: call.name,
            args: pendingArgs,
            label: preview.label ?? call.name,
            createdAt: Date.now(),
            href: preview.navigate?.href,
            severity,
          });

          if (preview.navigate) {
            emit(controller, {
              type: "nav_pending",
              id: token,
              href: preview.navigate.href,
              label: preview.navigate.label,
              severity,
            });
          } else {
            emit(controller, {
              type: "confirm_pending",
              id: token,
              name: call.name,
              label: preview.label ?? call.name,
              args: pendingArgs,
              severity,
            });
          }

          pendingConfirmId = token;
          break;
        }

        const result = await executeAssistantTool(call.name, call.args, toolCtx);
        emit(controller, {
          type: "tool_result",
          id,
          name: call.name,
          ok: result.ok,
          summary: result.summary,
        });
        const dataForModel =
          call.name === "search_domain_candidates" &&
          result.data &&
          typeof result.data === "object" &&
          Array.isArray((result.data as { candidates?: unknown }).candidates)
            ? {
                ...(result.data as Record<string, unknown>),
                candidates: (
                  (result.data as { candidates: unknown[] }).candidates ?? []
                ).slice(0, 25),
              }
            : result.data;
        const dataSlice =
          call.name === "search_domain_candidates" || call.name === "get_domain_candidate"
            ? 8000
            : 1800;
        toolNotes.push(
          `tool ${call.name} => ${result.ok ? "ok" : "fail"}: ${result.summary}\n${JSON.stringify(dataForModel ?? {}).slice(0, dataSlice)}`,
        );
      }

      if (pendingConfirmId) {
        return pendingConfirmId;
      }

      workingMessages.push({
        role: "assistant",
        content: JSON.stringify({
          bubbles: turn.bubbles,
          tool_calls: turn.toolCalls,
        }),
      });
      workingMessages.push({
        role: "user",
        content: [
          "תוצאות הכלים (המשך בתשובה קצרה בסגנון שלך, בלי לחזור על JSON של כלים אלא אם צריך כלי נוסף):",
          ...toolNotes,
        ].join("\n"),
      });
    }

    emit(controller, { type: "bubble", text: "רגע עצרתי פה" });
    emit(controller, { type: "bubble", text: "תגיד מה הכי דחוף" });
    return undefined;
  }
}
