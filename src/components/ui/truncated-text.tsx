"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TruncatedTextProps {
  text: string;
  className?: string;
}

interface TooltipCoords {
  top: number;
  left: number;
  maxWidth: number;
}

export function TruncatedText({ text, className = "" }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords>({ top: 0, left: 0, maxWidth: 240 });

  const refresh = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    setCoords({
      top: rect.top,
      left: rect.left,
      maxWidth: Math.max(rect.width, Math.min(320, window.innerWidth - rect.left - 16)),
    });
    setOverflows(
      element.scrollWidth > element.clientWidth + 1 ||
        element.scrollHeight > element.clientHeight + 1,
    );
  }, []);

  useEffect(() => {
    if (!visible) return;
    refresh();
    const onLayoutChange = () => refresh();
    window.addEventListener("scroll", onLayoutChange, true);
    window.addEventListener("resize", onLayoutChange);
    return () => {
      window.removeEventListener("scroll", onLayoutChange, true);
      window.removeEventListener("resize", onLayoutChange);
    };
  }, [visible, refresh, text]);

  const showTooltip = () => {
    refresh();
    setVisible(true);
  };

  const hideTooltip = () => setVisible(false);

  const tooltip =
    visible && overflows && typeof document !== "undefined"
      ? createPortal(
          <span
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top - 8,
              left: coords.left,
              maxWidth: coords.maxWidth,
              transform: "translateY(-100%)",
              zIndex: 9999,
            }}
            className="pointer-events-none rounded-lg border border-border-weak/80 bg-surface-1 px-2.5 py-1.5 text-xs font-semibold leading-snug text-text-primary shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={ref}
        className={`block min-w-0 ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {text}
      </span>
      {tooltip}
    </>
  );
}
