import { Env } from "@/lib/env";
import type { AssistantChatMessage, AssistantLlmTurn } from "@/modules/assistant/lib/protocol";

function normalizeSecret(raw: string | undefined): string {
  if (raw == null) return "";
  let s = String(raw).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        // fall through to plain-text bubbles
      }
    }
    // Soft fallback: model returned prose instead of JSON
    const lines = trimmed
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("```"))
      .slice(0, 8);
    if (lines.length > 0) {
      return { bubbles: lines, tool_calls: [] };
    }
    throw new Error("assistant_invalid_json");
  }
}

function parseTurn(raw: unknown): AssistantLlmTurn {
  const obj = (raw ?? {}) as {
    bubbles?: unknown;
    tool_calls?: unknown;
    toolCalls?: unknown;
  };
  const bubblesRaw = Array.isArray(obj.bubbles) ? obj.bubbles : [];
  const bubbles = bubblesRaw
    .map((b) => String(b ?? "").trim())
    .filter((b) => b.length > 0)
    .slice(0, 12);

  const callsRaw = Array.isArray(obj.tool_calls)
    ? obj.tool_calls
    : Array.isArray(obj.toolCalls)
      ? obj.toolCalls
      : [];
  const toolCalls = callsRaw
    .map((call) => {
      const c = call as { name?: unknown; args?: unknown; arguments?: unknown };
      const name = String(c.name ?? "").trim();
      if (!name) return null;
      const argsSource = c.args ?? c.arguments ?? {};
      const args =
        argsSource && typeof argsSource === "object" && !Array.isArray(argsSource)
          ? (argsSource as Record<string, unknown>)
          : {};
      return { name, args };
    })
    .filter((c): c is { name: string; args: Record<string, unknown> } => Boolean(c))
    .slice(0, 4);

  return { bubbles, toolCalls };
}

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export class AssistantLlmProvider {
  private static resolveGeminiKey(): string {
    for (const key of [
      Env.get("GEMINI_API_KEY"),
      Env.get("GEMINI_KEY"),
      Env.get("GOOGLE_GENERATIVE_AI_API_KEY"),
      Env.get("GOOGLE_API_KEY"),
    ]) {
      const n = normalizeSecret(key);
      if (n) return n;
    }
    return "";
  }

  private static resolveOpenAiKey(): string {
    return normalizeSecret(Env.get("OPENAI_API_KEY"));
  }

  public static isConfigured(): boolean {
    return Boolean(this.resolveGeminiKey() || this.resolveOpenAiKey());
  }

  public static async complete(input: {
    system: string;
    messages: AssistantChatMessage[];
    timeoutMs?: number;
  }): Promise<AssistantLlmTurn> {
    const timeoutMs = input.timeoutMs ?? 35_000;
    const geminiKey = this.resolveGeminiKey();
    if (geminiKey) {
      try {
        const text = await withTimeout(timeoutMs, (signal) =>
          this.callGemini({
            apiKey: geminiKey,
            model: String(Env.get("GEMINI_MODEL") ?? "gemini-2.5-flash").trim(),
            system: input.system,
            messages: input.messages,
            signal,
          }),
        );
        return parseTurn(extractJsonObject(text));
      } catch (geminiError) {
        const openaiKey = this.resolveOpenAiKey();
        if (!openaiKey) throw geminiError;
      }
    }

    const openaiKey = this.resolveOpenAiKey();
    if (!openaiKey) {
      throw new Error("assistant_llm_not_configured");
    }
    const text = await withTimeout(timeoutMs, (signal) =>
      this.callOpenAi({
        apiKey: openaiKey,
        model: String(Env.get("OPENAI_MODEL") ?? "gpt-4o-mini").trim(),
        system: input.system,
        messages: input.messages,
        signal,
      }),
    );
    return parseTurn(extractJsonObject(text));
  }

  private static async callOpenAi(input: {
    apiKey: string;
    model: string;
    system: string;
    messages: AssistantChatMessage[];
    signal: AbortSignal;
  }): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: input.signal,
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        temperature: 0.55,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.system },
          ...input.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`openai_failed_${res.status}:${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("openai_empty_response");
    return text;
  }

  private static async callGemini(input: {
    apiKey: string;
    model: string;
    system: string;
    messages: AssistantChatMessage[];
    signal: AbortSignal;
  }): Promise<string> {
    const contents = input.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents,
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 900,
        responseMimeType: "application/json",
      },
    });

    const tryModel = async (model: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
      return fetch(url, {
        method: "POST",
        signal: input.signal,
        headers: { "Content-Type": "application/json" },
        body,
      });
    };

    let res = await tryModel(input.model);
    if (!res.ok && res.status === 404) {
      res = await tryModel("gemini-2.5-flash");
    }
    if (!res.ok && res.status === 404) {
      res = await tryModel("gemini-3.5-flash-lite");
    }
    const raw = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`gemini_failed_${res.status}:${raw.slice(0, 200)}`);
    }
    const data = JSON.parse(raw) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!text) throw new Error("gemini_empty_response");
    return text;
  }
}
