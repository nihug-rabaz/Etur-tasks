"use client";

import Image from "next/image";
import Link from "next/link";
import { Compass, Megaphone, Target, Users } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const INTRO_VIDEO_SRC = "/intro.mp4";

type IntroPhase = "ready" | "playing" | "complete" | "failed";

const launchItems = [
  {
    label: "איתור",
    detail: "קצינים",
    href: "/agam",
    icon: Compass,
    accent: "#22b8cf",
    className: "intro-launch-button--recruitment",
  },
  {
    label: "מיצוב",
    detail: "נגדים",
    href: "/nagadim",
    icon: Target,
    accent: "#fb923c",
    className: "intro-launch-button--positioning",
  },
  {
    label: "דוברות",
    detail: "תוכן ואישורים",
    href: "/dovrut",
    icon: Megaphone,
    accent: "#8b5cf6",
    className: "intro-launch-button--dovrut",
  },
  {
    label: "מלש״בים",
    detail: "ראיונות ומעקב",
    href: "/malshabim",
    icon: Users,
    accent: "#10b981",
    className: "intro-launch-button--malshabim",
  },
] as const;

const orbitStyle: CSSProperties = {
  position: "relative",
  width: "min(86vw, 34rem)",
  height: "min(86vw, 34rem)",
  maxHeight: "82vh",
  aspectRatio: "1 / 1",
  isolation: "isolate",
};

const ringStyle: CSSProperties = {
  position: "absolute",
  inset: "9%",
  borderRadius: "9999px",
  background:
    "conic-gradient(from 18deg, rgba(34, 184, 207, 0.9), rgba(251, 146, 60, 0.9), rgba(139, 92, 246, 0.85), rgba(16, 185, 129, 0.85), rgba(34, 184, 207, 0.9))",
  boxShadow: "0 0 34px rgba(34, 184, 207, 0.26)",
  opacity: 0.9,
  WebkitMask: "radial-gradient(circle, transparent 60%, #000 61%, #000 64%, transparent 65%)",
  mask: "radial-gradient(circle, transparent 60%, #000 61%, #000 64%, transparent 65%)",
};

const logoStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  display: "flex",
  width: "clamp(8.8rem, 32vw, 12.75rem)",
  height: "clamp(8.8rem, 32vw, 12.75rem)",
  transform: "translate(-50%, -50%)",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  borderRadius: "9999px",
  background: "rgba(255, 255, 255, 0.96)",
  padding: "clamp(0.9rem, 3vw, 1.35rem)",
  boxShadow:
    "0 0 0 1px rgba(255, 255, 255, 0.56), 0 24px 70px rgba(0, 0, 0, 0.45), 0 0 48px rgba(255, 255, 255, 0.22)",
  zIndex: 2,
};

function nodeStyle(index: number): CSSProperties {
  const angle = index * 90;
  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    zIndex: 3,
    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(clamp(-11.2rem, -28vw, -7.6rem)) rotate(${-angle}deg)`,
  };
}

function buttonStyle(accent: string): CSSProperties {
  return {
    ["--launch-accent" as string]: accent,
    display: "flex",
    width: "clamp(6.2rem, 19vw, 8.8rem)",
    height: "clamp(6.2rem, 19vw, 8.8rem)",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.24rem",
    borderRadius: "9999px",
    background: `linear-gradient(145deg, ${accent}, ${accent}dd)`,
    color: "#ffffff",
    textAlign: "center",
    textDecoration: "none",
    boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.36), inset 0 0 0 1px rgba(255, 255, 255, 0.24), 0 18px 42px rgba(0, 0, 0, 0.46), 0 0 34px ${accent}80`,
    backdropFilter: "blur(14px) saturate(1.25)",
  };
}

const labelStyle: CSSProperties = {
  fontSize: "clamp(1.05rem, 3vw, 1.35rem)",
  fontWeight: 900,
  lineHeight: 1.05,
};

const detailStyle: CSSProperties = {
  maxWidth: "82%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "clamp(0.68rem, 1.8vw, 0.78rem)",
  fontWeight: 700,
  color: "rgba(255, 255, 255, 0.8)",
};

export function IntroSplash() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<IntroPhase>("ready");
  const [showLaunchButtons, setShowLaunchButtons] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback(() => setVisible(false), []);
  const complete = useCallback(() => {
    for (const video of [videoRef.current, backgroundVideoRef.current]) {
      if (!video) continue;
      video.pause();
      if (Number.isFinite(video.duration) && video.duration > 0.1) {
        video.currentTime = Math.max(0, video.duration - 0.06);
      }
    }

    setPhase("complete");
  }, []);

  const revealLaunchButtons = useCallback(() => {
    if (phase === "complete") {
      setShowLaunchButtons(true);
    }
  }, [phase]);

  const hideLaunchButtons = useCallback(() => {
    setShowLaunchButtons(false);
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
      // Autoplay-with-sound can still fail in rare cases; keep UI playable muted.
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
                  className="absolute inset-0 z-10 flex items-center justify-center px-4 py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),rgba(0,0,0,0.38)_48%,rgba(0,0,0,0.68)_100%)]" />
                  <motion.div
                    className="intro-launch-orbit"
                    style={orbitStyle}
                    initial={{ scale: 0.9, filter: "blur(6px)" }}
                    animate={{ scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                    onMouseLeave={hideLaunchButtons}
                  >
                    <div className="intro-launch-ring" style={ringStyle} aria-hidden />
                    <button
                      type="button"
                      className="intro-launch-logo"
                      style={logoStyle}
                      onMouseEnter={revealLaunchButtons}
                      onFocus={revealLaunchButtons}
                      aria-label="הצג אפשרויות כניסה"
                    >
                      <Image
                        src="/logo-intro.png"
                        alt="מדור אומ״ץ הרבנות הצבאית"
                        width={1024}
                        height={1024}
                        priority
                        className="h-full w-full object-contain"
                      />
                    </button>
                    {showLaunchButtons ? launchItems.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.href}
                          className={`intro-launch-node intro-launch-node--${index + 1}`}
                          style={nodeStyle(index)}
                        >
                          <motion.div
                            initial={{ opacity: 0, scale: 0.65 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.12 + index * 0.08, duration: 0.45, ease: "easeOut" }}
                          >
                            <Link
                              href={item.href}
                              onClick={dismiss}
                              className={`intro-launch-button ${item.className}`}
                              style={buttonStyle(item.accent)}
                            >
                              <Icon size={24} strokeWidth={2.35} aria-hidden />
                              <span className="intro-launch-button__label" style={labelStyle}>
                                {item.label}
                              </span>
                              <span className="intro-launch-button__detail" style={detailStyle}>
                                {item.detail}
                              </span>
                            </Link>
                          </motion.div>
                        </div>
                      );
                    }) : null}
                  </motion.div>
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
              className="absolute bottom-6 end-6 z-20 rounded-full bg-black/50 px-7 py-3.5 text-base font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 sm:px-8 sm:py-4 sm:text-lg"
            >
              דלג
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default IntroSplash;
