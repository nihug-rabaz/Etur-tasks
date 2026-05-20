"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, UserRound } from "lucide-react";

export type AssigneeOption = {
  id: string;
  name: string;
  avatar: string | null;
};

const AVATAR_PALETTE = ["#65ba73", "#ff7575", "#cab641", "#ffb84d", "#7e57ff", "#4f46e5", "#0891b2", "#d946ef"];

function pickAvatarBg(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatarMark({
  name,
  avatarUrl,
  size = "md",
  variant = "default",
}: {
  name: string;
  avatarUrl: string | null;
  size?: "xs" | "sm" | "md";
  variant?: "default" | "flush";
}) {
  const url = avatarUrl?.startsWith("http") ? avatarUrl : null;
  const box =
    size === "xs"
      ? "h-6 w-6 text-[9px]"
      : size === "sm"
        ? "h-8 w-8 text-[10px]"
        : "h-9 w-9 text-xs";
  const imgRing =
    variant === "flush" ? "" : "ring-2 ring-surface-1 dark:ring-surface-2";
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${box} shrink-0 rounded-full object-cover ${imgRing}`}
      />
    );
  }
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full font-bold text-white shadow-inner`}
      style={{ backgroundColor: pickAvatarBg(name || "?") }}
    >
      {initialsFrom(name || "?")}
    </span>
  );
}

interface AssigneeSelectProps {
  value: string;
  onChange: (userId: string) => void;
  users: AssigneeOption[];
  triggerClassName?: string;
}

export function AssigneeSelect({ value, onChange, users, triggerClassName }: AssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0, maxH: 240 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const selected = users.find((u) => u.id === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const syncMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const maxH = Math.min(240, Math.max(120, window.innerHeight - r.bottom - gap - 16));
    setMenuRect({ top: r.bottom + gap, left: r.left, width: r.width, maxH });
  };

  useLayoutEffect(() => {
    if (!open) return;
    syncMenuPosition();
    const onScroll = () => syncMenuPosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const t = event.target as Node;
      if (containerRef.current?.contains(t)) return;
      const menu = document.getElementById(listboxId);
      if (menu?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, listboxId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const baseTrigger =
    "flex w-full items-center gap-3 rounded-2xl border border-border-weak bg-surface-2/50 px-3 py-2.5 text-start text-sm text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition hover:bg-surface-2/70 focus:border-accent-primary/55 focus:bg-surface-1 focus:ring-2 focus:ring-accent-primary/22";

  const menu = open ? (
    <ul
      id={listboxId}
      role="listbox"
      style={{
        position: "fixed",
        top: menuRect.top,
        left: menuRect.left,
        width: menuRect.width,
        maxHeight: menuRect.maxH,
        zIndex: 20000,
      }}
      className="overflow-y-auto overscroll-contain rounded-2xl border border-border-weak bg-surface-1 py-1.5 shadow-[0_18px_50px_rgba(2,6,23,0.22)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.45)]"
    >
      <li role="option" aria-selected={value === ""}>
        <button
          type="button"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition hover:bg-surface-2/80"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-weak bg-surface-2/50 text-text-muted">
            <UserRound size={16} />
          </span>
          <span className="flex-1 font-medium text-text-secondary">ללא שיוך</span>
          {value === "" ? <Check size={16} className="shrink-0 text-accent-primary" /> : null}
        </button>
      </li>
      <div className="mx-2 my-1 h-px bg-border-weak/80" />
      {users.map((user) => {
        const isSel = user.id === value;
        return (
          <li key={user.id} role="option" aria-selected={isSel}>
            <button
              type="button"
              onClick={() => {
                onChange(user.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition ${
                isSel ? "bg-accent-primary/10" : "hover:bg-surface-2/80"
              }`}
            >
              <UserAvatarMark name={user.name} avatarUrl={user.avatar} />
              <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{user.name}</span>
              {isSel ? <Check size={16} className="shrink-0 text-accent-primary" /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName ?? baseTrigger}
      >
        {selected ? (
          <>
            <UserAvatarMark name={selected.name} avatarUrl={selected.avatar} />
            <span className="min-w-0 flex-1 truncate font-medium">{selected.name}</span>
          </>
        ) : (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong bg-surface-1/80 text-text-muted">
              <UserRound size={16} strokeWidth={2} />
            </span>
            <span className="flex-1 text-text-muted">ללא שיוך</span>
          </>
        )}
        <ChevronDown
          size={16}
          className={`shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

interface AssigneeMultiSelectProps {
  value: string[];
  onChange: (userIds: string[]) => void;
  users: AssigneeOption[];
}

export function AssigneeMultiSelect({ value, onChange, users }: AssigneeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0, maxH: 280 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const selectedUsers = useMemo(() => users.filter((u) => value.includes(u.id)), [users, value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const syncMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const maxH = Math.min(280, Math.max(120, window.innerHeight - r.bottom - gap - 16));
    setMenuRect({ top: r.bottom + gap, left: r.left, width: Math.max(r.width, 260), maxH });
  };

  useLayoutEffect(() => {
    if (!open) return;
    syncMenuPosition();
    const onScroll = () => syncMenuPosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const t = event.target as Node;
      if (containerRef.current?.contains(t)) return;
      const menu = document.getElementById(listboxId);
      if (menu?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, listboxId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleUser = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const baseTrigger =
    "flex min-h-[46px] w-full items-center gap-2 rounded-2xl border border-border-weak bg-surface-2/50 px-3 py-2 text-start text-sm text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition hover:bg-surface-2/70 focus:border-accent-primary/55 focus:bg-surface-1 focus:ring-2 focus:ring-accent-primary/22";

  const menu = open ? (
    <ul
      id={listboxId}
      role="listbox"
      aria-multiselectable="true"
      style={{
        position: "fixed",
        top: menuRect.top,
        left: menuRect.left,
        width: menuRect.width,
        maxHeight: menuRect.maxH,
        zIndex: 20000,
      }}
      className="overflow-y-auto overscroll-contain rounded-2xl border border-border-weak bg-surface-1 py-1.5 shadow-[0_18px_50px_rgba(2,6,23,0.22)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.45)]"
    >
      <li>
        <button
          type="button"
          onClick={() => {
            onChange([]);
            setOpen(false);
          }}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition hover:bg-surface-2/80"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-weak bg-surface-2/50 text-text-muted">
            <UserRound size={16} />
          </span>
          <span className="flex-1 font-medium text-text-secondary">ללא שיוך</span>
        </button>
      </li>
      <div className="mx-2 my-1 h-px bg-border-weak/80" />
      {users.map((user) => {
        const isSel = value.includes(user.id);
        return (
          <li key={user.id} role="option" aria-selected={isSel}>
            <button
              type="button"
              onClick={() => toggleUser(user.id)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition ${
                isSel ? "bg-accent-primary/10" : "hover:bg-surface-2/80"
              }`}
            >
              <UserAvatarMark name={user.name} avatarUrl={user.avatar} />
              <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{user.name}</span>
              {isSel ? <Check size={16} className="shrink-0 text-accent-primary" /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={baseTrigger}
      >
        {selectedUsers.length === 0 ? (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong bg-surface-1/80 text-text-muted">
              <UserRound size={16} strokeWidth={2} />
            </span>
            <span className="flex-1 text-text-muted">בחרו משתמש אחד או יותר…</span>
          </>
        ) : (
          <>
            <span className="flex shrink-0 items-center">
              {selectedUsers.slice(0, 4).map((user, i) => (
                <span
                  key={user.id}
                  className={`rounded-full ring-2 ring-surface-1 dark:ring-surface-2 ${i > 0 ? "-ms-2.5" : ""}`}
                  style={{ zIndex: 8 - i }}
                >
                  <UserAvatarMark name={user.name} avatarUrl={user.avatar} size="sm" />
                </span>
              ))}
            </span>
            <span className="min-w-0 flex-1 truncate text-start font-medium">
              {selectedUsers.length === 1
                ? selectedUsers[0].name
                : `${selectedUsers.length} משתמשים נבחרו`}
            </span>
          </>
        )}
        <ChevronDown
          size={16}
          className={`ms-auto shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
