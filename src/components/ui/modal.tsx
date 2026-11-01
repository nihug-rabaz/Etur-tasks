"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

const SIZE_CLASS = { md: "max-w-2xl", lg: "max-w-4xl" } as const;

export function Modal({ open, onClose, title, subtitle, icon, footer, size = "lg", children }: ModalProps) {
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
          <motion.button
            type="button"
            aria-label="סגירה"
            className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "חלון"}
            className={`ui-modal relative flex max-h-[min(88dvh,56rem)] w-full ${SIZE_CLASS[size]} flex-col overflow-hidden rounded-3xl bg-surface-1 shadow-2xl`}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "tween", duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
            <header className="flex shrink-0 items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(22,24,29,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] sm:px-6">
              {icon}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-extrabold tracking-tight text-text-primary">{title}</h2>
                {subtitle ? <p className="truncate text-xs text-text-muted">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                className="shrink-0 rounded-xl bg-surface-2 p-2 text-text-secondary transition hover:bg-accent-primary/10 hover:text-accent-primary"
              >
                <X size={17} strokeWidth={2.2} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div>
            {footer ? (
              <footer className="flex shrink-0 items-center justify-end gap-2 px-5 py-3 shadow-[inset_0_1px_0_rgba(22,24,29,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-6">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
