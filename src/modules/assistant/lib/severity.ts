import type { ApiHttpMethod } from "@/modules/assistant/tools/api-proxy";
import type { AssistantActionSeverity } from "@/modules/assistant/services/audit.service";

/** Classify mutation severity for extra confirmation + audit. */
export function classifyMutationSeverity(input: {
  toolName: string;
  method?: string | null;
  path?: string | null;
  args?: Record<string, unknown>;
}): AssistantActionSeverity {
  const method = String(input.method ?? input.args?.method ?? "").toUpperCase();
  const path = String(input.path ?? input.args?.path ?? "");

  if (input.toolName === "navigate") return "normal";

  if (method === "DELETE") return "destructive";

  // Bulk / irreversible-ish surfaces
  if (/\/import\b/i.test(path)) return "destructive";
  if (/recycle-bin|archive/i.test(path) && method !== "GET") return "destructive";

  // Closing / rejecting / hard status flips
  const body = input.args?.body;
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (b.status === "completed" || b.status === "not_passed") return "destructive";
    if (b.candidate_status === "אושר" || b.approve === false || b.decision === "reject") {
      return "destructive";
    }
  }

  if (input.toolName === "update_task" && input.args?.status === "completed") {
    return "destructive";
  }

  return "normal";
}

export function mutationLabel(input: {
  method?: ApiHttpMethod | string;
  path?: string;
  label?: string;
}): string {
  if (input.label?.trim()) return input.label.trim();
  return `${input.method ?? "?"} ${input.path ?? ""}`.trim();
}
