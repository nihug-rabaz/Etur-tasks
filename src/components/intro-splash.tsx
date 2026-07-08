"use client";

import Image from "next/image";
import { LogIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const INTRO_VIDEO_SRC = "/intro.mp4";

type IntroPhase = "ready" | "playing" | "failed";

export function IntroSplash() {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<IntroPhase>("ready");
  const videoRef = useRef<HTMLVideoElement>(null);

  const dismiss = useCallback(() => setVisible(false), []);

  const enter = useCallback(() => {
    if (phase !== "ready") return;
    setPhase("playing");
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    void video.play().catch(() => setPhase("failed"));
  }, [phase]);

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
          {phase === "playing" ? (
            <video
              ref={videoRef}
              src={INTRO_VIDEO_SRC}
              className="h-full w-full object-cover"
              playsInline
              preload="auto"
              onEnded={dismiss}
              onError={() => setPhase("failed")}
            />
          ) : null}

          {phase === "ready" ? (
            <div
              className="absolute inset-0 flex items-center justify-center px-6"
              style={{
                background:
                  "radial-gradient(120% 120% at 50% 20%, #a78bfa 0%, #7c3aed 38%, #1e1b4b 72%, #0c0a14 100%)",
              }}
            >
              <span className="pointer-events-none absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="relative flex w-full max-w-sm flex-col items-center text-center pb-24 sm:pb-20"
              >
                <div className="mb-6 overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-[0_28px_70px_-18px_rgba(0,0,0,0.55)] sm:p-5">
                  <Image
                    src="/logo-intro.png"
                    alt="מדור אומ״ץ הרבנות הצבאית"
                    width={1024}
                    height={1024}
                    priority
                    className="h-auto w-[min(72vw,13.5rem)] select-none sm:w-[min(58vw,15.5rem)]"
                  />
                </div>
                <p className="mb-1 text-sm font-semibold tracking-[0.28em] text-white/70">מערכת ניהול משימות</p>
                <h1 className="mb-5 text-xl font-black text-white sm:text-2xl">ברוכים הבאים</h1>
              </motion.div>
            </div>
          ) : null}

          {phase === "ready" ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-6">
              <button
                type="button"
                onClick={enter}
                className="pointer-events-auto inline-flex w-full max-w-xs items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-accent-primary to-accent-cyan px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_-10px_rgba(139,92,246,0.65)] transition hover:brightness-105 hover:shadow-[0_20px_48px_-10px_rgba(139,92,246,0.75)] active:scale-[0.98]"
              >
                <LogIn size={20} strokeWidth={2.5} />
                כניסה למערכת
              </button>
            </div>
          ) : null}

          {phase === "failed" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0c0a14] px-6 text-center">
              <p className="text-lg font-bold text-white">מערכת ניהול משימות</p>
              <p className="text-sm text-white/70">מדור איתור ומיצוב</p>
              {phase === "failed" ? (
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-accent-primary to-accent-cyan px-6 py-3 text-sm font-bold text-white"
                >
                  <LogIn size={16} />
                  המשך לאתר
                </button>
              ) : null}
            </div>
          ) : null}

          {phase === "playing" ? (
            <button
              type="button"
              onClick={dismiss}
              className="absolute bottom-6 end-6 z-10 rounded-full bg-black/45 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
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
