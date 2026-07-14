"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserAvatarMark } from "@/components/ui/assignee-select";
import type { TabTaskAssignee } from "@/services/dashboard.service";

export function TaskAssigneeStack({ assignees }: { assignees: TabTaskAssignee[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const [pos, setPos] = useState({ top: 0, left: 0, width: 232 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const sync = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = 232;
    let left = r.left;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (left < 8) left = 8;
    setPos({ top: r.bottom + 8, left, width: w });
  };

  useLayoutEffect(() => {
    if (!open) return;
    sync();
    const fn = () => sync();
    window.addEventListener("scroll", fn, true);
    window.addEventListener("resize", fn);
    return () => {
      window.removeEventListener("scroll", fn, true);
      window.removeEventListener("resize", fn);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return;
      const pop = document.getElementById(popoverId);
      if (pop?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, popoverId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (assignees.length === 0) return null;

  const maxShow = 4;
  const shown = assignees.slice(0, maxShow);
  const extra = assignees.length - maxShow;

  const popover = open ? (
    <div
      id={popoverId}
      role="dialog"
      aria-label="משויכים למשימה"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 20000,
      }}
      className="rounded-xl border border-border-weak bg-surface-1 py-2 shadow-[0_16px_48px_rgba(2,6,23,0.28)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
    >
      <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
        משויכים למשימה
      </p>
      <ul className="max-h-52 space-y-0.5 overflow-y-auto px-1">
        {assignees.map((person) => (
          <li key={person.id}>
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <UserAvatarMark name={person.name} avatarUrl={person.avatar} size="sm" />
              <span className="min-w-0 truncate text-sm font-medium text-text-primary">{person.name}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <>
      <div
        ref={anchorRef}
        className="flex shrink-0 cursor-pointer items-center rounded-lg py-0.5 ps-0.5 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/35"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {shown.map((person, i) => (
          <div
            key={person.id}
            className={`group/assignee relative ${i > 0 ? "-ms-1" : ""}`}
            style={{ zIndex: 8 - i }}
            title={person.name}
          >
            <UserAvatarMark name={person.name} avatarUrl={person.avatar} size="xs" variant="flush" />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition group-hover/assignee:opacity-100">
              {person.name}
            </span>
          </div>
        ))}
        {extra > 0 ? (
          <span
            className="-ms-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border-2 border-background bg-surface-2 px-1 text-[9px] font-bold text-text-secondary dark:bg-surface-2"
            style={{ zIndex: 0 }}
          >
            +{extra}
          </span>
        ) : null}
      </div>
      {mounted && popover ? createPortal(popover, document.body) : null}
    </>
  );
}
