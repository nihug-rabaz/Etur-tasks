"use client";

import Script from "next/script";
import { useEffect } from "react";
import { OneSignalWebClient } from "@/lib/onesignal/onesignal-web-client";

export function OneSignalBootstrap({ externalId }: { externalId?: string }) {
  useEffect(() => {
    OneSignalWebClient.bootstrap();
  }, []);

  useEffect(() => {
    if (!externalId) return;
    void OneSignalWebClient.login(externalId);
  }, [externalId]);

  if (!OneSignalWebClient.isConfigured()) return null;

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  );
}
