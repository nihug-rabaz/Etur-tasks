"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, FolderKanban, ListChecks, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { domainKeyFromName, domainMeta } from "@/lib/ui/domains";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";
import type { SearchResults } from "@/services/search.service";

interface DashboardSearchProps {
  accentHex: string;
  className?: string;
  onSelectTask: (task: { id: string; title: string }) => void;
}

const EMPTY: SearchResults = { tasks: [], projects: [] };

function accentForDomain(domainName: string | null): string {
  const key = domainKeyFromName(domainName);
  return key ? domainMeta[key].accentHex : "#8b909c";
}

export function DashboardSearch({ accentHex, className, onSelectTask }: DashboardSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const hasResults = results.tasks.length > 0 || results.projects.length > 0;

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setResults(EMPTY);
          return;
        }
        const data = (await response.json()) as SearchResults;
        setResults({ tasks: data.tasks ?? [], projects: data.projects ?? [] });
      } catch {
        // aborted or network error — keep previous results
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const openTask = useCallback(
    (task: { id: string; title: string }) => {
      setOpen(false);
      onSelectTask(task);
    },
    [onSelectTask],
  );

  const goToProject = useCallback(
    (projectId: string) => {
      setOpen(false);
      router.push(`/projects/${projectId}`);
    },
    [router],
  );

  const showPanel = open && trimmed.length >= 2;

  const emptyState = useMemo(
    () => !loading && trimmed.length >= 2 && !hasResults,
    [loading, trimmed, hasResults],
  );

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative flex items-center">
        <Search
          size={18}
          className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          aria-label="חיפוש משימות, פרויקטים או משתמשים"
          placeholder="חיפוש משימות, פרויקטים או משתמשים..."
          style={{ ["--tw-ring-color" as string]: `${accentHex}55` }}
          className="w-full rounded-full bg-surface-1 py-3.5 ps-11 pe-10 text-sm text-text-primary shadow-[var(--shadow-soft)] outline-none transition focus:ring-2"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(EMPTY);
            }}
            aria-label="ניקוי חיפוש"
            className="absolute end-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {showPanel ? (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.985 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute inset-x-0 top-[calc(100%+0.6rem)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl bg-surface-1 p-2 shadow-[0_24px_60px_-20px_rgba(22,24,29,0.4)]"
          >
            {loading && !hasResults ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-text-muted">
                <Loader2 size={16} className="animate-spin" />
                מחפש…
              </div>
            ) : null}

            {emptyState ? (
              <div className="px-4 py-8 text-center text-sm text-text-muted">
                לא נמצאו תוצאות עבור &laquo;{trimmed}&raquo;
              </div>
            ) : null}

            {results.projects.length > 0 ? (
              <div className="px-2 pb-1 pt-2">
                <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
                  פרויקטים
                </p>
                {results.projects.map((project) => {
                  const accent = accentForDomain(project.domain_name);
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => goToProject(project.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-surface-2"
                    >
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${accent}1f`, color: accent }}
                      >
                        <FolderKanban size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">
                          {project.name}
                        </span>
                        <span className="block truncate text-xs text-text-muted">
                          {project.subtopic_name ? toHebrewSubtopicLabel(project.subtopic_name) : "ללא תת-נושא"}
                        </span>
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: `${accent}1f`, color: accent }}
                      >
                        פרויקט
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {results.tasks.length > 0 ? (
              <div className="px-2 pb-2 pt-1">
                <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
                  משימות
                </p>
                {results.tasks.map((task) => {
                  const accent = accentForDomain(task.domain_name);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => openTask({ id: task.id, title: task.title })}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-surface-2"
                    >
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${accent}1f`, color: accent }}
                      >
                        <ListChecks size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">
                          {task.title}
                        </span>
                        <span className="flex items-center gap-2 truncate text-xs text-text-muted">
                          <span className="truncate">
                            {task.subtopic_name ? toHebrewSubtopicLabel(task.subtopic_name) : "ללא תת-נושא"}
                          </span>
                          {task.due_date ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock size={11} />
                              {new Date(task.due_date).toLocaleDateString("he-IL")}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: `${accent}1f`, color: accent }}
                      >
                        משימה
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
