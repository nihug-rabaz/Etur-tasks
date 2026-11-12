"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type SearchableMultiOption = { value: string; label: string };

type Props = {
  label: string;
  options: SearchableMultiOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  menuMinWidth?: number;
};

export function SearchableMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "בחירה מרובה…",
  menuMinWidth = 280,
}: Props) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0, maxH: 360 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selectedOptions = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value],
  );
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchQuery]);
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((o) => value.includes(o.value));

  useEffect(() => {
    setMounted(true);
  }, []);

  const showSearch = options.length > 5;
  const estimatedContentHeight = useMemo(() => {
    const header = showSearch ? 108 : 44;
    const row = 44;
    const listPad = 12;
    const footer = value.length > 0 ? 56 : 0;
    const rows = Math.max(filtered.length, 1);
    return header + rows * row + listPad + footer;
  }, [filtered.length, showSearch, value.length]);

  const syncMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    const margin = 12;
    const maxPanel = 380;
    const spaceBelow = window.innerHeight - r.bottom - gap - margin;
    const spaceAbove = r.top - gap - margin;
    const preferred = Math.min(maxPanel, estimatedContentHeight);
    const openUp = spaceBelow < preferred && spaceAbove > spaceBelow;
    const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
    const panelHeight = Math.min(preferred, available);
    const width = Math.max(r.width, menuMinWidth);
    const left = Math.min(Math.max(margin, r.left), window.innerWidth - width - margin);
    const top = openUp
      ? Math.max(margin, r.top - gap - panelHeight)
      : r.bottom + gap;
    setMenuRect({ top, left, width, maxH: panelHeight });
  };

  useLayoutEffect(() => {
    if (!open) return;
    syncMenuPosition();
    const onScroll = (event: Event) => {
      const menu = menuRef.current;
      if (menu && event.target instanceof Node && menu.contains(event.target)) return;
      syncMenuPosition();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, menuMinWidth, estimatedContentHeight]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }
    if (!showSearch) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const t = event.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (document.getElementById(listboxId)?.contains(t)) return;
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

  const toggle = (optionValue: string) => {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const drop = new Set(filtered.map((o) => o.value));
      onChange(value.filter((v) => !drop.has(v)));
      return;
    }
    const merged = new Set(value);
    for (const o of filtered) merged.add(o.value);
    onChange([...merged]);
  };

  const summary =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? selectedOptions[0].label
        : `${selectedOptions[0].label} +${selectedOptions.length - 1}`;

  const menu = open ? (
    <div
      ref={menuRef}
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
      className="flex flex-col overflow-hidden rounded-2xl border border-border-weak bg-surface-1 shadow-[0_18px_50px_rgba(2,6,23,0.22)]"
    >
      <div className="shrink-0 space-y-2 border-b border-border-weak/80 p-3">
        {showSearch ? (
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש..."
              className="w-full rounded-xl border border-border-weak bg-surface-2/70 py-2.5 ps-9 pe-3 text-sm text-text-primary outline-none transition focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2 px-0.5 text-xs">
          <span className="font-medium text-text-muted">
            {options.length} אפשרויות · נבחרו {value.length}
          </span>
          <div className="flex items-center gap-2">
            {value.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="font-bold text-text-secondary transition hover:text-text-primary"
              >
                ניקוי
              </button>
            ) : null}
            {filtered.length > 0 ? (
              <button
                type="button"
                onClick={toggleAllFiltered}
                className="font-bold text-accent-primary transition hover:underline"
              >
                {allFilteredSelected ? "ביטול הכל" : "בחירת הכל"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <ul className="min-h-0 overflow-y-auto overscroll-contain py-1.5">
        {filtered.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-text-muted">לא נמצאו תוצאות</li>
        ) : (
          filtered.map((option) => {
            const checked = value.includes(option.value);
            return (
              <li key={option.value} role="option" aria-selected={checked}>
                <button
                  type="button"
                  onClick={() => toggle(option.value)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition ${
                    checked ? "bg-accent-primary/10" : "hover:bg-surface-2/80"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-accent-primary bg-accent-primary text-white"
                        : "border-border-strong bg-surface-1"
                    }`}
                    aria-hidden
                  >
                    {checked ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-text-primary">
                    {option.label}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
      {value.length > 0 ? (
        <div className="shrink-0 border-t border-border-weak/80 p-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent-primary/10 py-2.5 text-sm font-bold text-accent-primary transition hover:bg-accent-primary/15"
          >
            <Check size={15} />
            סיום ({value.length})
          </button>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <p className="text-xs font-bold text-black dark:text-text-primary">{label}</p>
      <div
        ref={triggerRef}
        className="flex min-h-[46px] w-full items-center gap-2 rounded-xl border border-border-weak bg-white px-3 py-2 text-sm text-black shadow-sm dark:bg-surface-2 dark:text-text-primary"
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-start outline-none"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span
            className={`min-w-0 flex-1 truncate font-medium ${
              selectedOptions.length === 0 ? "text-text-muted" : "text-text-primary"
            }`}
          >
            {summary}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {value.length > 0 ? (
          <button
            type="button"
            className="rounded-full p-1 text-text-muted transition hover:bg-surface-1 hover:text-text-primary"
            aria-label="נקה בחירה"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
