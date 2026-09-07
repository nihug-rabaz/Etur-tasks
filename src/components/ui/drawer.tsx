"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  customHeader?: ReactNode;
}

export function Drawer({ open, onClose, title, subtitle, customHeader, children }: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="סגירה"
            className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-[3px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : "תפריט צד"}
            className="ui-drawer fixed inset-y-0 right-0 z-[110] flex h-dvh max-h-dvh w-full max-w-xl flex-col overflow-hidden bg-surface-1"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          >
            <header className="ui-divider relative z-10 flex shrink-0 items-start justify-between gap-3 bg-surface-1 px-4 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
              <div className="min-w-0 flex-1 pe-2">
                {customHeader ?? (
                  <>
                    <h2 className="text-xl font-extrabold tracking-tight text-text-primary">{title}</h2>
                    {subtitle ? (
                      <p className="mt-1 text-sm leading-relaxed text-text-secondary">{subtitle}</p>
                    ) : null}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                className="ui-card shrink-0 rounded-xl bg-surface-2 p-2.5 text-text-secondary transition hover:bg-accent-primary/10 hover:text-accent-primary"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
              {children}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
