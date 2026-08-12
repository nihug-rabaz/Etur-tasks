interface OneSignalPushSubscription {
  id: string | null | undefined;
  optedIn: boolean;
  optIn: () => Promise<void>;
  optOut: () => Promise<void>;
}

interface OneSignalSdk {
  init: (options: {
    appId: string;
    safari_web_id?: string;
    notifyButton?: { enable: boolean };
    serviceWorkerPath?: string;
    serviceWorkerParam?: { scope: string };
    allowLocalhostAsSecureOrigin?: boolean;
  }) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  User: {
    PushSubscription: OneSignalPushSubscription;
  };
  Notifications: {
    requestPermission: () => Promise<boolean>;
  };
}

interface Window {
  OneSignalDeferred?: Array<(oneSignal: OneSignalSdk) => void | Promise<void>>;
  OneSignal?: OneSignalSdk;
}
