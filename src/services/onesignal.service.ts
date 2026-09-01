import { AppUrls } from "@/lib/urls/app-urls";
import { OneSignalServerConfig } from "@/lib/onesignal/onesignal-server-config";

export interface PushPayload {
  heading: string;
  content: string;
  url?: string;
}

export class OneSignalService {
  public isReady(): boolean {
    return OneSignalServerConfig.isSendReady();
  }

  /** Send a test push to a single user, identified by their profile id. */
  public async sendTestPush(userId: string): Promise<{ notificationId: string }> {
    return this.sendPushToUser(userId, {
      heading: "בדיקת התראה",
      content: "זו הודעת בדיקה מניהול משימות",
      url: AppUrls.getOrigin() || undefined,
    });
  }

  public async sendPushToUser(userId: string, payload: PushPayload): Promise<{ notificationId: string }> {
    if (!OneSignalServerConfig.isSendReady()) {
      throw new Error("MISSING_REST_API_KEY");
    }
    const body = this.buildPayload(payload, { external_id: [userId] });
    return this.postNotification(body);
  }

  public async sendDirectMessages(
    userIds: string[],
    message: string,
    url?: string,
  ): Promise<{ sent: number; failed: number; total: number }> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { sent: 0, failed: 0, total: 0 };
    }
    if (!OneSignalServerConfig.isSendReady()) {
      return { sent: 0, failed: uniqueIds.length, total: uniqueIds.length };
    }

    const payload = this.messageToPayload(message, url);
    let sent = 0;
    let failed = 0;

    for (const userId of uniqueIds) {
      try {
        await this.sendPushToUser(userId, payload);
        sent += 1;
      } catch (error) {
        if (error instanceof Error && error.message === "USER_NOT_SUBSCRIBED") {
          failed += 1;
          continue;
        }
        console.error("[onesignal-direct]", userId, error);
        failed += 1;
      }
    }

    return { sent, failed, total: uniqueIds.length };
  }

  public async broadcastToSubscribedUsers(
    message: string,
    url?: string,
  ): Promise<{ sent: number; failed: number; total: number }> {
    if (!OneSignalServerConfig.isSendReady()) {
      return { sent: 0, failed: 0, total: 0 };
    }

    const payload = this.buildPayload(this.messageToPayload(message, url), {
      included_segments: ["Subscribed Users"],
    });

    try {
      await this.postNotification(payload);
      return { sent: 1, failed: 0, total: 1 };
    } catch (error) {
      console.error("[onesignal-broadcast]", error);
      return { sent: 0, failed: 1, total: 1 };
    }
  }

  /** Sends a plain-text notification, splitting the first line into the push heading. */
  public async sendTextToUser(userId: string, text: string, url?: string): Promise<boolean> {
    if (!OneSignalServerConfig.isSendReady()) return false;
    try {
      await this.sendPushToUser(userId, this.messageToPayload(text, url));
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === "USER_NOT_SUBSCRIBED") {
        return false;
      }
      throw error;
    }
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

  public messageToPayload(message: string, url?: string): PushPayload {
    const lines = message.split("\n").filter((line) => line.length > 0);
    const heading = lines[0] ?? "התראה";
    const content = lines.slice(1).join("\n") || heading;
    const extractedUrl = url ?? this.extractUrl(message);
    return { heading, content, url: extractedUrl };
  }

  private buildPayload(
    payload: PushPayload,
    targeting: Record<string, unknown>,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      app_id: OneSignalServerConfig.appId(),
      target_channel: "push",
      ...targeting,
      headings: { he: payload.heading, en: payload.heading },
      contents: { he: payload.content, en: payload.content },
    };
    if (payload.url) body.url = payload.url;
    return body;
  }

  private extractUrl(message: string): string | undefined {
    const match = message.match(/https?:\/\/\S+/);
    return match?.[0];
  }

  private async postNotification(body: Record<string, unknown>): Promise<{ notificationId: string }> {
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        Authorization: `Key ${OneSignalServerConfig.restApiKey()}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
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
