export type AssistantChatRole = "user" | "assistant";

export type AssistantChatMessage = {
  role: AssistantChatRole;
  content: string;
};

export type AssistantToolSide = "read" | "write";

export type AssistantConfirmSeverity = "normal" | "destructive";

export type AssistantSseEvent =
  | { type: "bubble"; text: string }
  | {
      type: "tool_request";
      id: string;
      name: string;
      args: Record<string, unknown>;
      side: AssistantToolSide;
      label?: string;
    }
  | {
      type: "tool_result";
      id: string;
      name: string;
      ok: boolean;
      summary: string;
    }
  | {
      type: "nav_pending";
      id: string;
      href: string;
      label: string;
      severity?: AssistantConfirmSeverity;
    }
  | {
      type: "confirm_pending";
      id: string;
      name: string;
      label: string;
      args: Record<string, unknown>;
      severity: AssistantConfirmSeverity;
    }
  | { type: "done"; pendingConfirmId?: string }
  | { type: "error"; message: string };

export type AssistantLlmTurn = {
  bubbles: string[];
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
};

export const ASSISTANT_DISPLAY_NAME = "לא נייהוז";
export const ASSISTANT_LOGO_SRC = "/assistant/lo-niyhoz-logo.jpg";
export const ASSISTANT_MAX_AGENT_ITERATIONS = 8;
