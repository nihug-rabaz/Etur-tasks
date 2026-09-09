"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Send, X, Loader2, GripVertical } from "lucide-react";
import {
  ASSISTANT_DISPLAY_NAME,
  ASSISTANT_LOGO_SRC,
  type AssistantConfirmSeverity,
  type AssistantSseEvent,
} from "@/modules/assistant/lib/protocol";

type ChatBubble = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

type PendingAction = {
  id: string;
  href: string;
  label: string;
  severity: AssistantConfirmSeverity;
};

type PanelLayout = {
  x: number;
  y: number;
  open: boolean;
};

const STORAGE_KEY = "etur-assistant-panel-v1";
const FAB_SIZE = 56;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 560;
const EDGE_PAD = 12;

function defaultLayout(): PanelLayout {
  if (typeof window === "undefined") {
    return { x: 0, y: 0, open: false };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: Math.max(EDGE_PAD, w - FAB_SIZE - EDGE_PAD),
    y: Math.max(EDGE_PAD, Math.round(h / 2 - FAB_SIZE / 2)),
    open: false,
  };
}

function clampLayout(layout: PanelLayout): PanelLayout {
  if (typeof window === "undefined") return layout;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const maxX = Math.max(EDGE_PAD, w - FAB_SIZE - EDGE_PAD);
  const maxY = Math.max(EDGE_PAD, h - FAB_SIZE - EDGE_PAD);
  return {
    x: Math.min(Math.max(EDGE_PAD, layout.x), maxX),
    y: Math.min(Math.max(EDGE_PAD, layout.y), maxY),
    open: layout.open,
  };
}

function loadLayout(): PanelLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLayout();
    const parsed = JSON.parse(raw) as Partial<PanelLayout>;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.open !== "boolean"
    ) {
      return defaultLayout();
    }
    return clampLayout({ x: parsed.x, y: parsed.y, open: parsed.open });
  } catch {
    return defaultLayout();
  }
}

function saveLayout(layout: PanelLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ignore quota / private mode
  }
}

function parseSseChunk(buffer: string): { events: AssistantSseEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: AssistantSseEvent[] = [];
  for (const part of parts) {
    const line = part
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("data:"));
    if (!line) continue;
    const raw = line.slice(5).trim();
    try {
      events.push(JSON.parse(raw) as AssistantSseEvent);
    } catch {
      // ignore malformed
    }
  }
  return { events, rest };
}

export function AssistantFloatingPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [layout, setLayout] = useState<PanelLayout>(() => defaultLayout());
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [destructiveAck, setDestructiveAck] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const layoutRef = useRef(layout);

  useLayoutEffect(() => {
    const stored = loadLayout();
    setLayout(stored);
    layoutRef.current = stored;
    setHydrated(true);
  }, []);

  useEffect(() => {
    layoutRef.current = layout;
    if (hydrated) saveLayout(layout);
  }, [layout, hydrated]);

  useEffect(() => {
    const onResize = () => {
      setLayout((prev) => clampLayout(prev));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/assistant/access");
        if (!res.ok) {
          if (!cancelled) setAllowed(false);
          return;
        }
        const data = (await res.json()) as { allowed?: boolean };
        if (!cancelled) setAllowed(Boolean(data.allowed));
      } catch {
        if (!cancelled) setAllowed(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [bubbles, layout.open, pendingAction]);

  const appendBubble = useCallback((role: ChatBubble["role"], text: string) => {
    setBubbles((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, text },
    ]);
  }, []);

  const handleEvents = useCallback(
    (events: AssistantSseEvent[]) => {
      for (const event of events) {
        if (event.type === "bubble") {
          appendBubble("assistant", event.text);
          const last = historyRef.current[historyRef.current.length - 1];
          if (last?.role === "assistant") {
            last.content = `${last.content}\n${event.text}`.trim();
          } else {
            historyRef.current.push({ role: "assistant", content: event.text });
          }
        } else if (event.type === "nav_pending") {
          setDestructiveAck(false);
          setPendingAction({
            id: event.id,
            href: event.href,
            label: event.label,
            severity: event.severity ?? "normal",
          });
        } else if (event.type === "confirm_pending") {
          setDestructiveAck(false);
          setPendingAction({
            id: event.id,
            href: "",
            label: event.label,
            severity: event.severity ?? "normal",
          });
        } else if (event.type === "error") {
          appendBubble("system", event.message);
        } else if (event.type === "tool_result" && !event.ok) {
          appendBubble("system", event.summary);
        }
      }
    },
    [appendBubble],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setPendingAction(null);
    setDestructiveAck(false);
    appendBubble("user", text);
    historyRef.current.push({ role: "user", content: text });
    setBusy(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyRef.current.slice(-30),
          pathname,
        }),
      });
      if (!res.ok || !res.body) {
        appendBubble("system", res.status === 429 ? "רגע, יותר מדי בקשות" : "לא הצלחתי לשלוח");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;
        handleEvents(parsed.events);
      }
      if (buffer.trim()) {
        const parsed = parseSseChunk(`${buffer}\n\n`);
        handleEvents(parsed.events);
      }
    } catch {
      appendBubble("system", "נפל החיבור");
    } finally {
      setBusy(false);
    }
  }, [appendBubble, busy, handleEvents, input, pathname]);

  const resolvePending = useCallback(
    async (approve: boolean) => {
      if (!pendingAction || confirming) return;
      if (
        approve &&
        pendingAction.severity === "destructive" &&
        !destructiveAck
      ) {
        appendBubble("system", "סמן שאישרת פעולה הרסנית");
        return;
      }
      setConfirming(true);
      try {
        const res = await fetch("/api/assistant/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toolCallId: pendingAction.id,
            approve,
            pathname,
            acknowledgeDestructive:
              pendingAction.severity === "destructive" ? destructiveAck : undefined,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          bubbles?: string[];
          navigate?: { href: string; label: string } | null;
          error?: string;
          requiresDestructiveAck?: boolean;
        };
        for (const b of data.bubbles ?? []) {
          appendBubble("assistant", b);
          const last = historyRef.current[historyRef.current.length - 1];
          if (last?.role === "assistant") {
            last.content = `${last.content}\n${b}`.trim();
          } else {
            historyRef.current.push({ role: "assistant", content: b });
          }
        }
        if (approve && data.navigate?.href) {
          router.push(data.navigate.href);
          setLayout((prev) => ({ ...prev, open: false }));
        }
        if (!res.ok && data.error) {
          appendBubble("system", data.error);
        }
      } catch {
        appendBubble("system", "האישור נכשל");
      } finally {
        setPendingAction(null);
        setDestructiveAck(false);
        setConfirming(false);
      }
    },
    [appendBubble, confirming, destructiveAck, pathname, pendingAction, router],
  );

  const onFabPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: layoutRef.current.x,
      originY: layoutRef.current.y,
      moved: false,
    };
  };

  const onFabPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && dx * dx + dy * dy > 16) {
      drag.moved = true;
    }
    if (!drag.moved) return;
    setLayout((prev) =>
      clampLayout({
        ...prev,
        x: drag.originX + dx,
        y: drag.originY + dy,
      }),
    );
  };

  const onFabPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    const wasDrag = drag.moved;
    dragRef.current = null;
    if (!wasDrag) {
      setLayout((prev) => ({ ...prev, open: !prev.open }));
    } else {
      setLayout((prev) => clampLayout(prev));
    }
  };

  if (!allowed || !hydrated) return null;

  const isDestructive = pendingAction?.severity === "destructive";
  const open = layout.open;

  const panelStyle = (() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const width = Math.min(vw - EDGE_PAD * 2, PANEL_WIDTH);
    const height = Math.min(vh * 0.7, PANEL_HEIGHT);
    // Anchor panel near FAB: prefer opening to the left (RTL dock on right)
    let left = layout.x + FAB_SIZE - width;
    if (left < EDGE_PAD) left = EDGE_PAD;
    if (left + width > vw - EDGE_PAD) left = Math.max(EDGE_PAD, vw - width - EDGE_PAD);
    let top = layout.y - height - 10;
    if (top < EDGE_PAD) top = layout.y + FAB_SIZE + 10;
    if (top + height > vh - EDGE_PAD) top = Math.max(EDGE_PAD, vh - height - EDGE_PAD);
    return { left, top, width, height };
  })();

  return (
    <>
      <button
        type="button"
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={onFabPointerUp}
        onPointerCancel={onFabPointerUp}
        className="fixed z-[95] inline-flex h-14 w-14 touch-none items-center justify-center overflow-hidden rounded-full bg-surface-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.45)] ring-2 ring-accent-primary/40 transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
        style={{ left: layout.x, top: layout.y }}
        aria-label={open ? `כווץ את ${ASSISTANT_DISPLAY_NAME}` : ASSISTANT_DISPLAY_NAME}
        title={open ? "לחיצה לכווץ · גרירה להזזה" : "לחיצה לפתיחה · גרירה להזזה"}
      >
        {open ? (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 text-white">
            <X className="h-5 w-5" />
          </span>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSISTANT_LOGO_SRC}
          alt={ASSISTANT_DISPLAY_NAME}
          className="pointer-events-none h-full w-full object-cover"
          draggable={false}
        />
      </button>

      {open ? (
        <section
          className="fixed z-[96] flex flex-col overflow-hidden rounded-2xl border border-border-weak bg-surface-1 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.4)]"
          style={{
            left: panelStyle.left,
            top: panelStyle.top,
            width: panelStyle.width,
            height: panelStyle.height,
          }}
          dir="rtl"
        >
          <header className="flex items-center justify-between border-b border-border-weak px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ASSISTANT_LOGO_SRC}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border-weak"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary">{ASSISTANT_DISPLAY_NAME}</p>
                <p className="text-xs text-text-muted">עוזר פיקוח למדור</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-text-muted">
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px]" title="גרור את הבועה">
                <GripVertical className="h-3.5 w-3.5" />
                גרירה
              </span>
              <button
                type="button"
                className="rounded-full p-1.5 text-text-secondary hover:bg-surface-2"
                onClick={() => setLayout((prev) => ({ ...prev, open: false }))}
                aria-label="כווץ"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {bubbles.length === 0 ? (
              <div className="space-y-2 pt-2">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-2 px-3 py-2 text-sm text-text-primary">
                  היי
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-2 px-3 py-2 text-sm text-text-primary">
                  מה המצב?
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-2 px-3 py-2 text-sm text-text-primary">
                  רוצה את הממתינים למיון?
                </div>
              </div>
            ) : null}
            {bubbles.map((b) => (
              <div
                key={b.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                  b.role === "user"
                    ? "mr-auto rounded-tr-sm bg-accent-primary text-white"
                    : b.role === "system"
                      ? "rounded-tl-sm bg-amber-500/15 text-amber-900 dark:text-amber-100"
                      : "rounded-tl-sm bg-surface-2 text-text-primary"
                }`}
              >
                {b.text}
              </div>
            ))}
            {busy ? (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2 text-xs text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                כותב…
              </div>
            ) : null}
          </div>

          {pendingAction ? (
            <div
              className={`border-t px-3 py-2 ${
                isDestructive
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-border-weak bg-surface-2/60"
              }`}
            >
              <p className="mb-2 text-xs text-text-secondary">
                {pendingAction.href
                  ? `לעבור אל ${pendingAction.label}?`
                  : isDestructive
                    ? `פעולה הרסנית: ${pendingAction.label}`
                    : `לאשר פעולה: ${pendingAction.label}?`}
              </p>
              {isDestructive ? (
                <label className="mb-2 flex items-start gap-2 text-xs text-text-primary">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={destructiveAck}
                    onChange={(e) => setDestructiveAck(e.target.checked)}
                  />
                  <span>אני מבין שזו פעולה הרסנית / בלתי הפיכה יחסית, ויש גיבוי ביומן</span>
                </label>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={confirming || (isDestructive && !destructiveAck)}
                  onClick={() => void resolvePending(true)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-60 ${
                    isDestructive ? "bg-red-600" : "bg-accent-primary"
                  }`}
                >
                  {isDestructive ? "מאשר הרסני" : "יאללה"}
                </button>
                <button
                  type="button"
                  disabled={confirming}
                  onClick={() => void resolvePending(false)}
                  className="flex-1 rounded-xl bg-surface-1 px-3 py-2 text-xs font-semibold text-text-secondary ring-1 ring-border-weak disabled:opacity-60"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : null}

          <form
            className="flex items-center gap-2 border-t border-border-weak p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="כתוב משהו…"
              disabled={busy || Boolean(pendingAction)}
              className="min-w-0 flex-1 rounded-xl bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-transparent placeholder:text-text-muted focus:ring-accent-primary/30 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || Boolean(pendingAction)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary text-white disabled:opacity-50"
              aria-label="שלח"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}
