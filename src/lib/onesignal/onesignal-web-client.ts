import { OneSignalPublicConfig } from "@/lib/onesignal/onesignal-config";

export class OneSignalWebClient {
  private static started = false;
  private static sdk: OneSignalSdk | null = null;
  private static readyPromise: Promise<OneSignalSdk | null> | null = null;
  private static resolveReady: ((sdk: OneSignalSdk | null) => void) | null = null;

  public static isConfigured(): boolean {
    return OneSignalPublicConfig.isConfigured();
  }

  /** Queue OneSignal.init before the CDN script finishes loading. */
  public static bootstrap(): void {
    if (typeof window === "undefined" || this.started || !this.isConfigured()) return;
    this.started = true;
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (oneSignal) => {
      try {
        await oneSignal.init({
          appId: OneSignalPublicConfig.appId(),
          safari_web_id: OneSignalPublicConfig.safariWebId() || undefined,
          notifyButton: { enable: true },
          serviceWorkerPath: "sw.js",
          serviceWorkerParam: { scope: "/" },
          allowLocalhostAsSecureOrigin: true,
        });
        this.sdk = oneSignal;
        this.resolveReady?.(oneSignal);
      } catch {
        this.resolveReady?.(null);
      }
    });
  }

  public static async whenReady(timeoutMs = 8000): Promise<OneSignalSdk | null> {
    if (!this.started) this.bootstrap();
    if (!this.readyPromise) return null;
    return this.withTimeout(this.readyPromise, timeoutMs, null);
  }

  public static async login(externalId: string): Promise<void> {
    const sdk = await this.whenReady();
    if (!sdk || !externalId) return;
    try {
      await sdk.login(externalId);
    } catch {
      return;
    }
  }

  public static async isOptedIn(): Promise<boolean> {
    const sdk = await this.whenReady();
    return Boolean(sdk?.User.PushSubscription.optedIn);
  }

  /** Ask the browser for push permission and opt the current device in. */
  public static async requestOptIn(externalId?: string): Promise<boolean> {
    const sdk = await this.whenReady();
    if (!sdk) return false;
    try {
      if (externalId) await sdk.login(externalId);
      await sdk.Notifications.requestPermission();
      if (!sdk.User.PushSubscription.optedIn) {
        await sdk.User.PushSubscription.optIn();
      }
      return Boolean(sdk.User.PushSubscription.optedIn);
    } catch {
      return false;
    }
  }

  private static withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => resolve(fallback), ms);
      promise
        .then((value) => {
          window.clearTimeout(timer);
          resolve(value);
        })
        .catch(() => {
          window.clearTimeout(timer);
          resolve(fallback);
        });
    });
  }
}
