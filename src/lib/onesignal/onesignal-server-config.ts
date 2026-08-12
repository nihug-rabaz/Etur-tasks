import { Env } from "@/lib/env";

export class OneSignalServerConfig {
  public static appId(): string {
    return Env.get("NEXT_PUBLIC_ONESIGNAL_APP_ID")?.trim() || Env.get("ONESIGNAL_APP_ID")?.trim() || "";
  }

  public static restApiKey(): string {
    return Env.get("ONESIGNAL_REST_API_KEY")?.trim() || "";
  }

  public static isSendReady(): boolean {
    return Boolean(this.appId() && this.restApiKey());
  }
}
