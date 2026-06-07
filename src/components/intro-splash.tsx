"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const DURATION_MS = 2800;

export function IntroSplash() {
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  // Play the intro on every full page load, then auto-dismiss (in-app navigation keeps it mounted, so it won't replay).
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="intro-splash"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          style={{ background: "radial-gradient(120% 120% at 50% 25%, #a78bfa 0%, #8b5cf6 40%, #22b8cf 100%)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          onClick={() => setVisible(false)}
        >
          <div className="pointer-events-none absolute inset-0">
            <motion.span
              className="absolute left-1/2 top-1/2 h-[60rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(56,189,248,0.22)_0%,rgba(56,189,248,0.08)_35%,transparent_70%)] blur-3xl"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
            />
          </div>

          <div className="relative flex flex-col items-center gap-7 px-6">
            <motion.div
              className="relative overflow-hidden rounded-[2rem] bg-white p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] sm:p-9"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: 14, filter: "blur(8px)" }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.15 }}
            >
              <Image
                src="/logo-mador.png"
                alt="מדור איתור ומיצוב - הרבנות הצבאית"
                width={1024}
                height={819}
                priority
                className="h-auto w-[min(70vw,22rem)] select-none"
              />
              {!reduceMotion ? (
                <motion.span
                  className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                  initial={{ left: "-40%" }}
                  animate={{ left: "130%" }}
                  transition={{ duration: 1.1, ease: "easeInOut", delay: 0.9 }}
                />
              ) : null}
            </motion.div>

            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                <p className="text-sm font-semibold tracking-[0.3em] text-white/80">מערכת ניהול משימות</p>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              </div>
              <motion.div
                className="h-0.5 w-40 origin-center rounded-full bg-gradient-to-r from-cyan-300/0 via-cyan-200 to-cyan-300/0"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, ease: "easeInOut", delay: 0.9 }}
              />
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default IntroSplash;
