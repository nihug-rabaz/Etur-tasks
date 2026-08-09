import { Env } from "@/lib/env";

export class DovrutAiWordingService {
  // Improves copy for spokespeople; uses OpenAI when configured, else a local polish pass.
  public async improve(input: {
    text: string;
    audience?: string;
    channel?: "signal" | "telegram" | "generic";
  }): Promise<{ text: string; provider: "openai" | "local"; channelHint?: string }> {
    const channel = input.channel ?? "generic";
    const apiKey = Env.get("OPENAI_API_KEY");
    if (apiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: Env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "אתה עורך דוברות צבאית בעברית. שפר ניסוח בצורה ברורה, מכבדת ומדויקת. החזר רק את הטקסט המשופר.",
              },
              {
                role: "user",
                content: [
                  input.audience ? `קהל יעד: ${input.audience}` : null,
                  channel !== "generic" ? `ערוץ: ${channel}` : null,
                  "טקסט:",
                  input.text,
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            ],
            temperature: 0.4,
          }),
        });
        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            return {
              text,
              provider: "openai",
              channelHint: channel === "signal" ? "מוכן גם ל־Signal" : undefined,
            };
          }
        }
      } catch {
        // fall through to local polish
      }
    }

    const cleaned = input.text
      .replace(/\s+/g, " ")
      .replace(/\s+([.,!?])/g, "$1")
      .trim();
    const audiencePrefix = input.audience ? `ל${input.audience}: ` : "";
    const channelHint =
      channel === "signal"
        ? "\n\n(גרסת Signal — קצרה וברורה)"
        : channel === "telegram"
          ? "\n\n(גרסת Telegram)"
          : "";
    return {
      text: `${audiencePrefix}${cleaned}${channelHint}`,
      provider: "local",
      channelHint: channel === "signal" ? "Signal עדיין אופציונלי — הניסוח מוכן" : undefined,
    };
  }
}
