"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, Plus, Share, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PromptMode = "android" | "ios";

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || navStandalone === true;
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOSDevice = /iphone|ipad|ipod/i.test(ua);
  const iPadOS = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  const webkit = /webkit/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return (iOSDevice || iPadOS) && webkit;
}

function recentlyDismissed(): boolean {
  try {
    const value = window.localStorage.getItem(DISMISS_KEY);
    if (!value) return false;
    const elapsed = Date.now() - Number(value);
    return elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function PwaInstallPrompt() {
  const [mode, setMode] = useState<PromptMode | null>(null);
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  // Registers the service worker that makes the app installable.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  // Decides whether and how to offer installation based on platform and prior dismissal.
  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("android");
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    let iosTimer: number | undefined;
    if (isIosSafari()) {
      iosTimer = window.setTimeout(() => {
        setMode("ios");
        setVisible(true);
      }, 1800);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore storage errors
    }
  }, []);

  // Triggers the native Android/Chrome install dialog.
  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
    dismiss();
  }, [deferred, dismiss]);

  return (
    <AnimatePresence>
      {visible && mode ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          dir="rtl"
          className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md rounded-2xl bg-surface-1 p-4 shadow-[0_24px_60px_-18px_rgba(22,24,29,0.45)] ring-1 ring-black/5"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="סגירה"
            className="absolute end-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3 pe-7">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2">
              <Image src="/icons/icon-192.png" alt="אפליקציה" width={48} height={48} className="h-12 w-12 object-contain" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-primary">התקנת האפליקציה</p>
              {mode === "android" ? (
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                  התקינו את המערכת על המכשיר לגישה מהירה ומסך מלא, ללא דפדפן.
                </p>
              ) : (
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                  להוספה למסך הבית: הקישו על
                  <Share size={13} className="mx-1 inline align-text-bottom text-accent-cyan" />
                  שיתוף, ואז בחרו
                  <span className="mx-1 inline-flex items-center gap-0.5 rounded-md bg-surface-2 px-1.5 py-0.5 font-semibold text-text-primary">
                    <Plus size={11} /> הוסף למסך הבית
                  </span>
                </p>
              )}
            </div>
          </div>

          {mode === "android" ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={install}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-cyan px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_-8px_rgba(34,184,207,0.6)] transition hover:brightness-105"
              >
                <Download size={16} />
                התקנה
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:text-text-primary"
              >
                אחר כך
              </button>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
