"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MessageSquareText, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UserAvatarMark } from "@/components/ui/assignee-select";

interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
}

interface TaskChatPanelProps {
  taskId: string;
  open: boolean;
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function TaskChatPanel({ taskId, open }: TaskChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldStickRef = useRef(true);

  const scrollToBottom = (smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  };

  const loadMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/messages`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (!silent) setError("לא הצלחנו לטעון את הצ'אט.");
        return [];
      }
      const next = Array.isArray(data.messages) ? (data.messages as ChatMessage[]) : [];
      setMessages(next);
      if (typeof data.currentUserId === "string") setCurrentUserId(data.currentUserId);
      setError("");
      return next;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    setInitialized(false);
    setExpanded(false);
    setMessages([]);
    setDraft("");
    setError("");

    const run = async () => {
      const next = await loadMessages(false);
      if (cancelled) return;
      setExpanded((next?.length ?? 0) > 0);
      setInitialized(true);
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  useEffect(() => {
    if (!open || !taskId || !expanded) return;
    const timer = window.setInterval(() => {
      void loadMessages(true);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [open, taskId, expanded]);

  useEffect(() => {
    if (!expanded || !shouldStickRef.current) return;
    scrollToBottom(false);
  }, [messages, loading, expanded]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickRef.current = distanceFromBottom < 48;
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    if (!expanded) setExpanded(true);
    const optimisticId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      body,
      createdAt: new Date().toISOString(),
      authorId: currentUserId || "self",
      authorName: "אני",
      authorAvatar: null,
    };
    setMessages((current) => [...current, optimistic]);
    setDraft("");
    shouldStickRef.current = true;
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      const response = await fetch(`/api/tasks/${taskId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.message) {
        setMessages((current) => current.filter((item) => item.id !== optimisticId));
        setDraft(body);
        setError(data.error === "Forbidden" ? "אין הרשאה לשלוח הודעה." : "שליחת ההודעה נכשלה.");
        return;
      }
      setMessages((current) => {
        const withoutTemp = current.filter((item) => item.id !== optimisticId);
        if (withoutTemp.some((item) => item.id === data.message.id)) return withoutTemp;
        return [...withoutTemp, data.message as ChatMessage];
      });
    } finally {
      setSending(false);
    }
  };

  const subtitle = loading && !initialized
    ? "טוען…"
    : messages.length === 0
      ? "עדיין אין הודעות"
      : `${messages.length} הודעות`;

  return (
    <section className="hud-glass-card overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition hover:bg-amber-50/70 ${
          expanded ? "border-b border-amber-200/40" : ""
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <MessageSquareText size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-amber-950">צ'אט משימה</span>
            <span className="block truncate text-[11px] font-medium text-amber-800/65">{subtitle}</span>
          </span>
        </span>
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100/80 text-amber-800 transition ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <ChevronDown size={16} strokeWidth={2.4} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="chat-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              ref={listRef}
              onScroll={handleScroll}
              className={`task-chat-scroll overflow-x-hidden overflow-y-auto overscroll-contain bg-gradient-to-b from-amber-50/40 to-white px-3 ${
                messages.length === 0 ? "max-h-none py-3" : "max-h-[220px] min-h-[96px] space-y-2.5 py-3"
              }`}
            >
              {loading && !initialized ? (
                <p className="py-3 text-center text-sm text-amber-800/70">טוען צ'אט…</p>
              ) : messages.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-amber-50/80 px-3 py-2.5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <MessageSquareText size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-950">התחילו שיחה על המשימה</p>
                    <p className="text-[11px] leading-snug text-amber-800/70">
                      עדכונים ותיאום בין המשויכים — במקום אחד.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isMine = Boolean(currentUserId) && message.authorId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={`flex max-w-[88%] min-w-0 items-end gap-2 ${isMine ? "ms-auto flex-row-reverse" : "me-auto"}`}
                    >
                      {!isMine ? (
                        <UserAvatarMark
                          name={message.authorName}
                          avatarUrl={message.authorAvatar}
                          size="xs"
                          variant="flush"
                        />
                      ) : null}
                      <div
                        className={`min-w-0 rounded-2xl px-3 py-2 shadow-sm ${
                          isMine
                            ? "rounded-bl-md bg-amber-500 text-white"
                            : "rounded-br-md border border-amber-200/50 bg-white text-amber-950"
                        }`}
                      >
                        {!isMine ? (
                          <p className="mb-0.5 text-[11px] font-bold text-amber-700">{message.authorName}</p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed">
                          {message.body}
                        </p>
                        <p className={`mt-1 text-[10px] font-medium ${isMine ? "text-white/75" : "text-amber-800/55"}`}>
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-amber-200/40 bg-white px-3 py-2.5">
              {error ? <p className="mb-2 text-xs font-semibold text-rose-600">{error}</p> : null}
              <div className="flex items-stretch gap-2 rounded-2xl border border-amber-300/70 bg-amber-50/50 p-1.5 transition focus-within:border-amber-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="כתבו הודעה… (Enter לשליחה)"
                  className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-sm leading-relaxed text-amber-950 outline-none ring-0"
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={sending || !draft.trim()}
                  aria-label="שליחת הודעה"
                  title="שליחה"
                  className="inline-flex h-10 w-10 shrink-0 self-end items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300 disabled:opacity-70"
                >
                  <SendHorizontal size={18} strokeWidth={2.5} className="-scale-x-100" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
