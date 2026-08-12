export class OneSignalPublicConfig {
  public static appId(): string {
    return process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() ?? "";
  }

  public static safariWebId(): string {
    return process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID?.trim() ?? "";
  }

  public static isConfigured(): boolean {
    return Boolean(this.appId());
  }
}
