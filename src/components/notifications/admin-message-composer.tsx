"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCheck,
  FolderKanban,
  Link2,
  ListChecks,
  Loader2,
  MessageSquarePlus,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { initialsFrom, pickAvatarBg } from "@/lib/ui/avatar";
import type { SearchResults } from "@/services/search.service";

interface LinkedItem {
  type: "task" | "project";
  id: string;
  title: string;
}

const EMPTY_RESULTS: SearchResults = { tasks: [], projects: [] };

function buildItemUrl(item: LinkedItem): string {
  const origin = window.location.origin;
  return item.type === "project" ? `${origin}/projects/${item.id}` : `${origin}/dashboard?task=${item.id}`;
}

interface Recipient {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  linkedAt: string | null;
}

type Mode = "selected" | "all";

interface AdminMessageComposerProps {
  iconOnly?: boolean;
  triggerLabel?: string;
}

export function AdminMessageComposer({ iconOnly = false, triggerLabel = "הודעה בטלגרם" }: AdminMessageComposerProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("selected");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [attached, setAttached] = useState<LinkedItem | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkResults, setLinkResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  // Searches tasks and projects to attach as a link inside the message.
  useEffect(() => {
    if (!linkOpen) return;
    const trimmed = linkQuery.trim();
    if (trimmed.length < 2) {
      setLinkResults(EMPTY_RESULTS);
      setLinkLoading(false);
      return;
    }
    setLinkLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!response.ok) {
          setLinkResults(EMPTY_RESULTS);
          return;
        }
        const data = (await response.json()) as SearchResults;
        setLinkResults({ tasks: data.tasks ?? [], projects: data.projects ?? [] });
      } catch {
        // aborted or network error
      } finally {
        setLinkLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [linkOpen, linkQuery]);

  // Loads the linked recipients whenever the composer is opened.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let cancelled = false;
    fetch("/api/telegram/recipients")
      .then((response) => (response.ok ? response.json() : { recipients: [] }))
      .then((data) => {
        if (cancelled) return;
        setRecipients(Array.isArray(data.recipients) ? data.recipients : []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sending) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, sending]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => `${r.name} ${r.username ?? ""}`.toLowerCase().includes(q));
  }, [recipients, query]);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const toggleAll = useCallback(() => {
    setSelected((current) => {
      const next = new Set(current);
      const everySelected = filtered.length > 0 && filtered.every((r) => next.has(r.id));
      for (const r of filtered) {
        if (everySelected) next.delete(r.id);
        else next.add(r.id);
      }
      return next;
    });
  }, [filtered]);

  const reset = useCallback(() => {
    setQuery("");
    setSelected(new Set());
    setMessage("");
    setMode("selected");
    setAttached(null);
    setLinkOpen(false);
    setLinkQuery("");
    setLinkResults(EMPTY_RESULTS);
  }, []);

  const attachItem = useCallback((item: LinkedItem) => {
    setAttached(item);
    setLinkOpen(false);
    setLinkQuery("");
    setLinkResults(EMPTY_RESULTS);
  }, []);

  const close = useCallback(() => {
    if (sending) return;
    setOpen(false);
  }, [sending]);

  const recipientCount = mode === "all" ? recipients.length : selected.size;
  const hasContent = message.trim().length > 0 || attached !== null;
  const canSend = !sending && hasContent && (mode === "all" ? recipients.length > 0 : selected.size > 0);

  const send = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const linkBlock = attached ? `${attached.title}\n${buildItemUrl(attached)}` : "";
      const composed = [message.trim(), linkBlock].filter(Boolean).join("\n\n");
      const endpoint = mode === "all" ? "/api/telegram/broadcast" : "/api/telegram/direct";
      const body =
        mode === "all"
          ? { message: composed }
          : { message: composed, userIds: Array.from(selected) };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.error === "Telegram bot not configured" ? "בוט הטלגרם אינו מוגדר" : "שליחת ההודעה נכשלה");
        return;
      }
      toast.success(`ההודעה נשלחה ל-${data.sent ?? 0} מתוך ${data.total ?? 0} משתמשים`);
      reset();
      setOpen(false);
    } finally {
      setSending(false);
    }
  }, [canSend, mode, message, selected, attached, reset]);

  const selectedRecipients = useMemo(
    () => recipients.filter((r) => selected.has(r.id)),
    [recipients, selected],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        title={triggerLabel}
        className={
          iconOnly
            ? "relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition hover:bg-accent-cyan/15 hover:text-accent-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/40"
            : "inline-flex items-center gap-2 rounded-full bg-accent-cyan px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_-8px_rgba(34,184,207,0.6)] transition hover:brightness-105"
        }
      >
        <MessageSquarePlus size={iconOnly ? 16 : 16} />
        {iconOnly ? null : triggerLabel}
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <>
                  <motion.div
                    className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={close}
                  />
                  <motion.div
                    className="fixed inset-0 z-[121] flex items-center justify-center p-3 sm:p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.section
                      dir="rtl"
                      onClick={(event) => event.stopPropagation()}
                      initial={{ y: 24, opacity: 0, scale: 0.97 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 14, opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                      className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-surface-1 shadow-[0_40px_90px_-24px_rgba(22,24,29,0.55)]"
                    >
                      <header className="relative flex items-center gap-3 bg-gradient-to-l from-[#229ED9] to-accent-cyan px-5 py-4 text-white">
                        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                          <Send size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-black leading-tight">שליחת הודעה בטלגרם</p>
                          <p className="text-xs font-medium text-white/80">הודעה פרטית למשתמשים נבחרים או לכולם</p>
                        </div>
                        <button
                          type="button"
                          onClick={close}
                          aria-label="סגירה"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                        >
                          <X size={16} />
                        </button>
                      </header>

                      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
                        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
                          <ModeTab active={mode === "selected"} onClick={() => setMode("selected")} icon={<Users size={15} />} label="נמענים נבחרים" />
                          <ModeTab active={mode === "all"} onClick={() => setMode("all")} icon={<CheckCheck size={15} />} label="כל המשתמשים" />
                        </div>

                        {mode === "selected" ? (
                          <div className="space-y-3">
                            {selectedRecipients.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {selectedRecipients.map((r) => (
                                  <span
                                    key={r.id}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-accent-cyan/12 py-1 pe-1 ps-2.5 text-xs font-semibold text-accent-cyan"
                                  >
                                    {r.name}
                                    <button
                                      type="button"
                                      onClick={() => toggle(r.id)}
                                      aria-label={`הסרה ${r.name}`}
                                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent-cyan/20 transition hover:bg-accent-cyan/40"
                                    >
                                      <X size={10} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            <div className="relative flex items-center">
                              <Search size={16} className="pointer-events-none absolute start-3 text-text-muted" aria-hidden />
                              <input
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="חיפוש משתמש…"
                                className="w-full rounded-xl bg-surface-2 py-2.5 ps-9 pe-3 text-sm text-text-primary outline-none transition focus:ring-2 focus:ring-accent-cyan/30"
                              />
                            </div>

                            <div className="flex items-center justify-between px-1">
                              <span className="text-xs font-medium text-text-muted">
                                {recipients.length} משתמשים מחוברים · נבחרו {selected.size}
                              </span>
                              {filtered.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={toggleAll}
                                  className="text-xs font-bold text-accent-cyan transition hover:underline"
                                >
                                  {allFilteredSelected ? "ניקוי הבחירה" : "בחירת הכל"}
                                </button>
                              ) : null}
                            </div>

                            <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl bg-surface-2/50 p-1.5">
                              {loading ? (
                                <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
                                  <Loader2 size={16} className="animate-spin" />
                                  טוען נמענים…
                                </div>
                              ) : filtered.length === 0 ? (
                                <div className="px-3 py-8 text-center text-sm text-text-muted">
                                  {recipients.length === 0 ? "אין משתמשים מחוברים לטלגרם." : "לא נמצאו תוצאות."}
                                </div>
                              ) : (
                                filtered.map((r) => {
                                  const isSelected = selected.has(r.id);
                                  return (
                                    <button
                                      key={r.id}
                                      type="button"
                                      onClick={() => toggle(r.id)}
                                      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition ${
                                        isSelected ? "bg-accent-cyan/12" : "hover:bg-surface-1"
                                      }`}
                                    >
                                      <span
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                        style={{ backgroundColor: pickAvatarBg(r.name || "?") }}
                                      >
                                        {initialsFrom(r.name || "?")}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-text-primary">{r.name}</span>
                                        {r.username ? (
                                          <span className="block truncate text-xs text-text-muted">@{r.username}</span>
                                        ) : null}
                                      </span>
                                      <span
                                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
                                          isSelected ? "bg-accent-cyan text-white" : "bg-surface-2 text-transparent"
                                        }`}
                                      >
                                        <Check size={13} strokeWidth={3} />
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 rounded-2xl bg-accent-cyan/10 p-4">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-cyan/20 text-accent-cyan">
                              <CheckCheck size={18} />
                            </span>
                            <p className="text-sm font-semibold text-text-primary">
                              ההודעה תישלח לכל {recipients.length} המשתמשים המחוברים לטלגרם.
                            </p>
                          </div>
                        )}

                        <div>
                          <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="כתבו את ההודעה כאן…"
                            rows={4}
                            maxLength={4000}
                            className="w-full resize-y rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-text-primary outline-none transition focus:ring-2 focus:ring-accent-cyan/30"
                          />
                          <div className="mt-1 px-1 text-end text-[11px] text-text-muted">{message.length} / 4000</div>
                        </div>

                        <div className="space-y-2">
                          {attached ? (
                            <div className="flex items-center gap-3 rounded-2xl bg-accent-cyan/10 p-3">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-cyan/20 text-accent-cyan">
                                {attached.type === "project" ? <FolderKanban size={16} /> : <ListChecks size={16} />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-text-primary">{attached.title}</span>
                                <span className="block text-xs text-text-muted">
                                  {attached.type === "project" ? "פרויקט מקושר" : "משימה מקושרת"} · יצורף כקישור
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setAttached(null)}
                                aria-label="הסרת קישור"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-text-muted transition hover:text-text-primary"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : linkOpen ? (
                            <div className="rounded-2xl bg-surface-2/50 p-2">
                              <div className="relative flex items-center">
                                <Search size={16} className="pointer-events-none absolute start-3 text-text-muted" aria-hidden />
                                <input
                                  type="search"
                                  autoFocus
                                  value={linkQuery}
                                  onChange={(event) => setLinkQuery(event.target.value)}
                                  placeholder="חיפוש משימה או פרויקט לקישור…"
                                  className="w-full rounded-xl bg-surface-1 py-2.5 ps-9 pe-3 text-sm text-text-primary outline-none transition focus:ring-2 focus:ring-accent-cyan/30"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLinkOpen(false);
                                    setLinkQuery("");
                                  }}
                                  aria-label="ביטול"
                                  className="absolute end-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition hover:text-text-primary"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                                {linkLoading ? (
                                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-text-muted">
                                    <Loader2 size={15} className="animate-spin" />
                                    מחפש…
                                  </div>
                                ) : linkQuery.trim().length < 2 ? (
                                  <p className="px-3 py-6 text-center text-xs text-text-muted">הקלידו לפחות 2 תווים לחיפוש</p>
                                ) : linkResults.projects.length === 0 && linkResults.tasks.length === 0 ? (
                                  <p className="px-3 py-6 text-center text-xs text-text-muted">לא נמצאו תוצאות</p>
                                ) : (
                                  <>
                                    {linkResults.projects.map((project) => (
                                      <LinkResultRow
                                        key={`p-${project.id}`}
                                        icon={<FolderKanban size={15} />}
                                        title={project.name}
                                        subtitle="פרויקט"
                                        onClick={() => attachItem({ type: "project", id: project.id, title: project.name })}
                                      />
                                    ))}
                                    {linkResults.tasks.map((task) => (
                                      <LinkResultRow
                                        key={`t-${task.id}`}
                                        icon={<ListChecks size={15} />}
                                        title={task.title}
                                        subtitle="משימה"
                                        onClick={() => attachItem({ type: "task", id: task.id, title: task.title })}
                                      />
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setLinkOpen(true)}
                              className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-accent-cyan/12 hover:text-accent-cyan"
                            >
                              <Link2 size={15} />
                              צירוף משימה או פרויקט
                            </button>
                          )}
                        </div>
                      </div>

                      <footer className="flex items-center justify-between gap-3 border-t border-border-weak/60 px-5 py-4">
                        <span className="text-xs font-medium text-text-muted">
                          {recipientCount > 0 ? `נשלח ל-${recipientCount} משתמשים` : "בחרו נמענים"}
                        </span>
                        <button
                          type="button"
                          onClick={send}
                          disabled={!canSend}
                          className="inline-flex items-center gap-2 rounded-full bg-accent-cyan px-6 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_-8px_rgba(34,184,207,0.65)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          {sending ? "שולח…" : "שליחה"}
                        </button>
                      </footer>
                    </motion.section>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

function LinkResultRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition hover:bg-surface-1"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-cyan/15 text-accent-cyan">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">{title}</span>
        <span className="block text-xs text-text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
        active ? "bg-surface-1 text-accent-cyan shadow-sm" : "text-text-muted hover:text-text-secondary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
