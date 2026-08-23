"use client";

import { Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TaskDetailsModal } from "@/components/task-details-modal";
import type { DovrutSearchHit, DovrutSearchResults } from "@/modules/dovrut/services/search.service";

const EMPTY: DovrutSearchResults = {
  campaigns: [],
  projects: [],
  items: [],
  inquirySubjects: [],
  messages: [],
  tasks: [],
};

const KIND_LABEL: Record<DovrutSearchHit["kind"], string> = {
  campaign: "קמפיין",
  project: "פרויקט",
  item: "אייטם",
  inquiry: "גורם תחקור",
  message: "מסר",
  task: "משימה",
};

const SECTIONS: Array<{ key: keyof DovrutSearchResults; label: string }> = [
  { key: "campaigns", label: "קמפיינים" },
  { key: "projects", label: "פרויקטים" },
  { key: "items", label: "אייטמים" },
  { key: "inquirySubjects", label: "גורמי תחקורים" },
  { key: "messages", label: "מסרים" },
  { key: "tasks", label: "משימות" },
];

export function DovrutDashboardSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DovrutSearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const totalHits = useMemo(
    () =>
      results.campaigns.length +
      results.projects.length +
      results.items.length +
      results.inquirySubjects.length +
      results.messages.length +
      results.tasks.length,
    [results],
  );

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
        const response = await fetch(`/api/dovrut/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          setResults(EMPTY);
          return;
        }
        setResults((await response.json()) as DovrutSearchResults);
      } catch {
        // aborted or network
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
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const openHit = useCallback(
    (hit: DovrutSearchHit) => {
      setOpen(false);
      if (hit.kind === "task") {
        setSelectedTask({ id: hit.id, title: hit.title });
        return;
      }
      router.push(hit.href);
    },
    [router],
  );

  const showPanel = open && trimmed.length >= 2;

  return (
    <>
      <div ref={containerRef} className="relative">
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
            aria-label="חיפוש בכל מערכת הדוברות"
            placeholder="חיפוש בכל מערכת הדוברות — קמפיינים, פרויקטים, אייטמים, גורמי תחקורים…"
            className="w-full rounded-2xl border border-black/8 bg-white py-3.5 ps-11 pe-10 text-sm text-text-primary shadow-sm outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-200 dark:border-white/10 dark:bg-[#161922] dark:focus:ring-violet-900/40"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults(EMPTY);
              }}
              aria-label="ניקוי חיפוש"
              className="absolute end-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-text-muted transition hover:bg-slate-100 hover:text-text-primary dark:hover:bg-slate-800"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>

        {showPanel ? (
          <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(70vh,28rem)] overflow-y-auto rounded-2xl border border-black/8 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#161922]">
            {loading && totalHits === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-text-muted">
                <Loader2 size={16} className="animate-spin" />
                מחפש…
              </div>
            ) : null}

            {!loading && totalHits === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-muted">
                לא נמצאו תוצאות עבור «{trimmed}»
              </div>
            ) : null}

            {SECTIONS.map((section) => {
              const rows = results[section.key];
              if (rows.length === 0) return null;
              return (
                <div key={section.key} className="px-1 py-1">
                  <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    {section.label}
                  </p>
                  {rows.map((hit) => (
                    <button
                      key={`${hit.kind}-${hit.id}`}
                      type="button"
                      onClick={() => openHit(hit)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-violet-50 dark:hover:bg-violet-950/30"
                    >
                      <span className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-text-primary">{hit.title}</p>
                        {hit.meta ? (
                          <p className="truncate text-[11px] text-text-muted">{hit.meta}</p>
                        ) : null}
                      </span>
                      <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                        {KIND_LABEL[hit.kind]}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}

          </div>
        ) : null}
      </div>

      {selectedTask ? (
        <TaskDetailsModal
          open
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
          onClose={() => setSelectedTask(null)}
        />
      ) : null}
    </>
  );
}
