import { AppUrls } from "@/lib/urls/app-urls";
import { OneSignalServerConfig } from "@/lib/onesignal/onesignal-server-config";

export class OneSignalService {
  /** Send a test push to a single user, identified by their profile id. */
  public async sendTestPush(userId: string): Promise<{ notificationId: string }> {
    if (!OneSignalServerConfig.isSendReady()) {
      throw new Error("MISSING_REST_API_KEY");
    }

    const payload: Record<string, unknown> = {
      app_id: OneSignalServerConfig.appId(),
      target_channel: "push",
      include_aliases: { external_id: [userId] },
      headings: { he: "בדיקת התראה", en: "Test notification" },
      contents: {
        he: "זו הודעת בדיקה מניהול משימות",
        en: "This is a test message from task management",
      },
    };
    const origin = AppUrls.getOrigin();
    if (origin) payload.url = origin;

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        Authorization: `Key ${OneSignalServerConfig.restApiKey()}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      errors?: unknown;
    };
    if (!response.ok || !data.id) {
      throw new Error(this.formatSendError(data.errors) || "SEND_FAILED");
    }
    return { notificationId: data.id };
  }

  public async hasPushSubscription(userId: string): Promise<boolean> {
    if (!OneSignalServerConfig.isSendReady() || !userId) return false;

    const response = await fetch(
      `https://api.onesignal.com/apps/${OneSignalServerConfig.appId()}/users/by/external_id/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Key ${OneSignalServerConfig.restApiKey()}`,
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (response.status === 404) return false;
    if (!response.ok) return false;

    const data = (await response.json().catch(() => null)) as {
      subscriptions?: Array<{ type?: string; enabled?: boolean; token?: string }>;
    } | null;
    return Boolean(
      data?.subscriptions?.some(
        (subscription) => subscription.enabled !== false && Boolean(subscription.token),
      ),
    );
  }

  private formatSendError(errors: unknown): string {
    if (errors && typeof errors === "object" && "invalid_aliases" in errors) {
      return "USER_NOT_SUBSCRIBED";
    }
    return this.formatError(errors);
  }

  private formatError(errors: unknown): string {
    if (!errors) return "";
    if (typeof errors === "string") return errors;
    if (Array.isArray(errors)) return errors.map((item) => String(item)).join(", ");
    if (typeof errors === "object") return JSON.stringify(errors);
    return String(errors);
  }
}
