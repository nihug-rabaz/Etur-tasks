"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlatformPortal } from "@/components/platform-portal";
import { isAgamCandidateSoldier } from "@/modules/agam/lib/candidate-access";
import type { ModuleRole } from "@/shared/modules/types";

const INTRO_VIDEO_SRC = "/intro.mp4";
const INTRO_DISMISS_KEY = "etur-intro-dismissed";

type IntroPhase = "ready" | "playing" | "complete" | "failed";

export function IntroSplash() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>("ready");
  const [portalAccess, setPortalAccess] = useState<{
    isPlatformAdmin: boolean;
    moduleRoles: Record<string, ModuleRole>;
  }>({ isPlatformAdmin: true, moduleRoles: {} });
  const videoRef = useRef<HTMLVideoElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    // Public approval deep links must skip intro + portal entirely.
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/dovrut-approve")) {
        setVisible(false);
        return;
      }
    }

    const revealIfNeeded = () => {
      try {
        // Show intro once per browser tab session — refresh keeps the current page.
        if (sessionStorage.getItem(INTRO_DISMISS_KEY) !== "1") {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    };

    void Promise.all([
      fetch("/api/auth/session").then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          user?: { role?: string; isAdmin?: boolean };
        } | null;
      }),
      fetch("/api/modules/roles").then(async (response) => {
        if (!response.ok) return {};
        const data = (await response.json()) as { roles?: Record<string, ModuleRole> };
        return data.roles ?? {};
      }),
    ])
      .then(([session, roles]) => {
        if (cancelled) return;
        const isPlatformAdmin =
          session?.user?.role === "admin" || Boolean(session?.user?.isAdmin);
        if (
          isAgamCandidateSoldier({
            isPlatformAdmin,
            platformRole: session?.user?.role,
            moduleRoles: roles,
          })
        ) {
          setVisible(false);
          return;
        }
        setPortalAccess({ isPlatformAdmin, moduleRoles: roles });
        revealIfNeeded();
      })
      .catch(() => {
        if (!cancelled) revealIfNeeded();
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }, []);
  const complete = useCallback(() => {
    for (const video of [videoRef.current, backgroundVideoRef.current]) {
      if (!video) continue;
      video.pause();
      if (Number.isFinite(video.duration) && video.duration > 0.1) {
        video.currentTime = Math.max(0, video.duration - 0.06);
      }
    }

    // Persist dismiss as soon as the module grid appears so refresh
    // does not replay the intro in this tab session.
    try {
      sessionStorage.setItem(INTRO_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setPhase("complete");
  }, []);

  const skipToFinalFrame = useCallback(() => {
    complete();
  }, [complete]);

  const startIntro = useCallback(async () => {
    const video = videoRef.current;
    const backgroundVideo = backgroundVideoRef.current;
    if (!video) {
      setPhase("failed");
      return;
    }

    setPhase("playing");

    try {
      video.currentTime = 0;
      video.muted = false;
      video.volume = 1;
      if (backgroundVideo) {
        backgroundVideo.currentTime = 0;
        backgroundVideo.muted = true;
        void backgroundVideo.play().catch(() => undefined);
      }
      await video.play();
    } catch {
      try {
        video.muted = true;
        await video.play();
      } catch {
        setPhase("failed");
      }
    }
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="intro-splash"
          className="fixed inset-0 z-[200] overflow-hidden bg-[#0c0a14]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          role="presentation"
        >
          {phase !== "failed" ? (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
              <video
                ref={backgroundVideoRef}
                src={INTRO_VIDEO_SRC}
                className="pointer-events-none absolute inset-[-5%] h-[110%] w-[110%] scale-110 object-cover opacity-50 blur-3xl saturate-150 md:hidden"
                playsInline
                muted
                preload="auto"
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-0 bg-black/30 md:hidden" />
              <video
                ref={videoRef}
                src={INTRO_VIDEO_SRC}
                className={`relative z-[1] h-full w-full object-contain md:object-cover ${
                  phase === "ready" ? "opacity-0" : "opacity-100"
                }`}
                playsInline
                preload="auto"
                onEnded={complete}
                onError={() => setPhase("failed")}
              />

              <AnimatePresence>
                {phase === "ready" ? (
                  <motion.div
                    key="intro-gate"
                    className="intro-entry-gate absolute inset-0 z-10 flex flex-col items-center justify-center px-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  >
                    <div className="intro-entry-gate__glow" aria-hidden />
                    <motion.div
                      className="intro-entry-gate__logo"
                      initial={{ scale: 0.88, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Image
                        src="/logo-intro.png"
                        alt="מדור אומ״ץ הרבנות הצבאית"
                        width={1024}
                        height={1024}
                        priority
                        className="h-full w-full object-contain"
                      />
                    </motion.div>
                    <motion.div
                      className="mt-8 flex max-w-md flex-col items-center text-center"
                      initial={{ y: 16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}
                    >
                      <p className="text-[0.72rem] font-bold tracking-[0.28em] text-white/55">
                        מדור אומ״ץ · הרבנות הצבאית
                      </p>
                      <h1
                        className="mt-3 text-3xl font-normal text-white sm:text-4xl"
                        style={{ fontFamily: "var(--font-secular), serif" }}
                      >
                        מערכת ניהול משימות
                      </h1>
                      <p className="mt-2 text-sm font-medium text-white/65">
                        לחצו להתחלה עם סאונד
                      </p>
                    </motion.div>
                    <motion.button
                      type="button"
                      onClick={() => void startIntro()}
                      className="intro-entry-button mt-8"
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.28, duration: 0.55, ease: "easeOut" }}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="intro-entry-button__label">כניסה למערכת</span>
                    </motion.button>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {phase === "complete" ? (
                <motion.div
                  className="absolute inset-0 z-10 bg-black"
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  <PlatformPortal
                    isPlatformAdmin={portalAccess.isPlatformAdmin}
                    moduleRoles={portalAccess.moduleRoles}
                    variant="overlay"
                    onNavigate={dismiss}
                  />
                </motion.div>
              ) : null}
            </div>
          ) : null}

          {phase === "failed" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0c0a14] px-6 text-center">
              <p className="text-lg font-bold text-white">מערכת ניהול משימות</p>
              <p className="text-sm text-white/70">מדור איתור ומיצוב</p>
              <button
                type="button"
                onClick={dismiss}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-accent-primary to-accent-cyan px-6 py-3 text-sm font-bold text-white"
              >
                המשך לאתר
              </button>
            </div>
          ) : null}

          {phase === "playing" ? (
            <button
              type="button"
              onClick={skipToFinalFrame}
              className="absolute bottom-6 end-6 z-20 rounded-full border border-white/15 bg-black/55 px-7 py-3.5 text-base font-bold text-white shadow-lg backdrop-blur-md transition hover:border-white/30 hover:bg-black/75 sm:px-8 sm:py-4 sm:text-lg"
            >
              דלג לפורטל
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default IntroSplash;
