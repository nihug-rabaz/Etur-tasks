"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, Megaphone, Radar } from "lucide-react";
import Image from "next/image";
import { ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MainTabItem } from "@/services/dashboard.service";
import { DashboardSearch } from "@/components/main-tabs/dashboard-search";
import { SectionGroup } from "@/components/main-tabs/section-group";
import {
  DashboardAmbientBackground,
  type DashboardAmbientTheme,
} from "@/components/main-tabs/dashboard-ambient-background";
import { DomainTopicTabs } from "@/components/domain-topic-tabs";
import { CreateProjectDrawer } from "@/components/create-project-drawer";
import { CreateTaskDrawer } from "@/components/create-task-drawer";
import { DailyPlanSidebar } from "@/components/daily-planner/daily-plan-sidebar";
import { TaskDetailsModal } from "@/components/task-details-modal";
import { TaskDragDropProvider } from "@/components/main-tabs/task-drag-drop-context";
import { TaskFilterBar } from "@/components/tasks/task-filter-bar";
import { TabTaskFilter } from "@/lib/tasks/tab-task-filter";
import { defaultTaskFilters, type TaskFilterState } from "@/lib/tasks/task-filter";
import { domainMeta, type DomainKey } from "@/lib/ui/domains";

interface MainTabsShellProps {
  tabs: MainTabItem[];
}

type TabSlug = MainTabItem["slug"];

const tabMeta: Record<
  TabSlug,
  {
    label: string;
    icon: ComponentType<{ size?: number }>;
    tabClass: string;
    contentClass: string;
    panelBgClass: string;
  }
> = {
  recruitment: {
    label: "איתור",
    icon: Radar,
    tabClass: "bg-sky-100",
    contentClass: "border-sky-200",
    panelBgClass: "bg-sky-50 dark:bg-sky-950/40",
  },
  positioning: {
    label: "מיצוב",
    icon: Megaphone,
    tabClass: "bg-rose-50",
    contentClass: "border-rose-200",
    panelBgClass: "bg-rose-50 dark:bg-rose-950/40",
  },
  general: {
    label: "כללי",
    icon: BriefcaseBusiness,
    tabClass: "bg-emerald-50",
    contentClass: "border-emerald-200",
    panelBgClass: "bg-emerald-50 dark:bg-emerald-950/40",
  },
};

const sectionNameMap: Record<string, string> = {
  Officers: "קצינים",
  NCOs: "נגדים",
  Candidates: "מלש״בים",
  PR: "יח״צ",
  "Social Media": "סושיאל",
  Visits: "ביקורים",
  General: "כללי",
};

const sectionOrderMap: Record<TabSlug, string[]> = {
  recruitment: ["מלש״בים", "קצינים", "נגדים"],
  positioning: ["יח״צ", "סושיאל", "ביקורים"],
  general: ["כללי"],
};

export function MainTabsShell({ tabs }: MainTabsShellProps) {
  const initialTab = tabs[0]?.slug ?? "recruitment";
  const [activeTab, setActiveTab] = useState<TabSlug>(initialTab);
  const [filters, setFilters] = useState(defaultTaskFilters);
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);
  const [dragMountSlugs, setDragMountSlugs] = useState<TabSlug[]>([]);
  const searchParams = useSearchParams();

  const handleDragActiveChange = useCallback((state: { active: boolean; sourceDomainSlug?: DomainKey }) => {
    if (!state.active || !state.sourceDomainSlug) {
      setDragMountSlugs([]);
      return;
    }
    setDragMountSlugs((current) =>
      current.includes(state.sourceDomainSlug!) ? current : [...current, state.sourceDomainSlug!],
    );
  }, []);

  const handleSwitchTabWhileDragging = useCallback((slug: TabSlug) => {
    setActiveTab(slug);
    setFilters(defaultTaskFilters);
    setDragMountSlugs((current) => (current.includes(slug) ? current : [...current, slug]));
  }, []);

  // Opens a task directly when arriving via a shared deep link (?task=<id>).
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId) return;
    setSelectedTask({ id: taskId, title: "" });
    const url = new URL(window.location.href);
    url.searchParams.delete("task");
    window.history.replaceState(null, "", url.toString());
  }, [searchParams]);

  const normalizedTabs = useMemo(() => {
    return tabs.map((tab) => {
      const normalizedSections = tab.sections.map((section) => ({
        ...section,
        name: sectionNameMap[section.name] ?? section.name,
      }));
      const mergedByName = new Map<string, (typeof normalizedSections)[number]>();
      for (const section of normalizedSections) {
        const existing = mergedByName.get(section.name);
        if (!existing) {
          mergedByName.set(section.name, {
            ...section,
            projects: [...section.projects],
            standaloneTasks: [...section.standaloneTasks],
          });
          continue;
        }
        const mergedStandalone = [...existing.standaloneTasks];
        for (const task of section.standaloneTasks) {
          if (!mergedStandalone.some((item) => item.id === task.id)) {
            mergedStandalone.push(task);
          }
        }
        mergedByName.set(section.name, {
          ...existing,
          projects: [...existing.projects, ...section.projects],
          standaloneTasks: mergedStandalone,
        });
      }
      const dedupedSections = Array.from(mergedByName.values());
      const sectionOrder = sectionOrderMap[tab.slug];
      if (tab.slug !== "general") {
        for (const mandatoryName of sectionOrder) {
          const exists = dedupedSections.some((section) => section.name === mandatoryName);
          if (!exists) {
            dedupedSections.push({
              id: `${tab.slug}-${mandatoryName}`,
              name: mandatoryName,
              projects: [],
              standaloneTasks: [],
            });
          }
        }
      }
      dedupedSections.sort((a, b) => {
        const aIndex = sectionOrder.indexOf(a.name);
        const bIndex = sectionOrder.indexOf(b.name);
        if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name, "he");
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      return { ...tab, sections: dedupedSections };
    });
  }, [tabs]);

  const selected = normalizedTabs.find((tab) => tab.slug === activeTab) ?? normalizedTabs[0];
  const accentHex = domainMeta[(selected?.slug ?? "general") as DomainKey]?.accentHex ?? "#8b5cf6";
  const domainDropTargets = useMemo(() => {
    const map: Partial<Record<DomainKey, { subtopicId: string; label: string }>> = {};
    for (const tab of normalizedTabs) {
      const section = tab.sections.find((item) => /^[0-9a-f-]{36}$/i.test(item.id));
      if (section) {
        map[tab.slug] = { subtopicId: section.id, label: section.name };
      }
    }
    return map;
  }, [normalizedTabs]);
  const mountedTabSlugs = useMemo(() => {
    if (dragMountSlugs.length === 0) return [activeTab];
    return Array.from(new Set([...dragMountSlugs, activeTab]));
  }, [activeTab, dragMountSlugs]);
  const isCrossTabDragging = dragMountSlugs.length > 0;

  if (!selected) {
    return (
      <section className="rounded-3xl border border-border-weak bg-surface-1/70 p-6">
        <p className="text-text-secondary">אין נתונים להצגה כרגע.</p>
      </section>
    );
  }

  return (
    <section className="relative isolate flex min-h-full flex-1 flex-col">
      <DashboardAmbientBackground theme={selected.slug as DashboardAmbientTheme} />

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-28 h-[55%] w-[72%] -translate-x-1/2 rounded-full blur-[140px] transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${accentHex}, transparent 68%)`, opacity: 0.5 }}
      />

      <div className="relative z-10 mx-auto flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] min-h-0 w-[96%] max-w-[2200px] flex-col gap-4 pb-4 pt-3 sm:gap-5 sm:pb-5 sm:pt-5">
      <div className="flex flex-col gap-3 px-1 sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
            <span className="brand-logo-orbit" style={{ ["--brand-glow" as string]: accentHex }}>
              <span aria-hidden className="brand-logo-orbit__glow" />
              <span aria-hidden className="brand-logo-orbit__ring" />
              <span className="brand-logo-orbit__inner">
                <Image
                  src="/logo-mador-omtz.png"
                  alt="מדור אומ״ץ"
                  width={112}
                  height={112}
                  priority
                  className="h-full w-full object-contain"
                />
              </span>
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-black leading-tight tracking-tight text-text-primary sm:text-4xl">פרויקטים ומשימות</h1>
              <p className="mt-0.5 text-xs font-medium text-text-secondary sm:text-sm">ניהול כל הסקציות והפרויקטים במקום אחד</p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2.5 sm:gap-3 lg:w-auto lg:flex-1 lg:max-w-2xl">
            <DashboardSearch
              accentHex={accentHex}
              className="min-w-0 flex-1"
              onSelectTask={(task) => setSelectedTask(task)}
            />
            <div className="shrink-0">
              <CreateTaskDrawer triggerLabel="יצירה מהירה" compact accentHex={accentHex} />
            </div>
          </div>
      </div>

      <TaskDragDropProvider
        domainDropTargets={domainDropTargets}
        onDragActiveChange={handleDragActiveChange}
        onSwitchTabWhileDragging={handleSwitchTabWhileDragging}
        onMovedToDomain={(slug) => {
          setActiveTab(slug);
          setFilters(defaultTaskFilters);
        }}
      >
      <div className="flex min-h-0 flex-1 items-stretch gap-3">
        <motion.div
          className="dashboard-glass-board relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl transition-shadow duration-700 sm:rounded-[2rem]"
          style={{ boxShadow: `0 40px 90px -28px ${accentHex}80, 0 18px 55px -22px ${accentHex}59` }}
        >
        <div className="dashboard-tabs-bar relative z-10 shrink-0 px-2 pt-2 sm:px-6 sm:pt-3">
          <DomainTopicTabs
            active={activeTab}
            showAll={false}
            counts={Object.fromEntries(
              normalizedTabs.map((tab) => [
                tab.slug,
                tab.sections.reduce(
                  (sum, section) =>
                    sum +
                    section.standaloneTasks.length +
                    section.projects.reduce((projectSum, project) => projectSum + project.tasks.length, 0),
                  0,
                ),
              ]),
            ) as Partial<Record<DomainKey, number>>}
            onChange={(key) => {
              if (key !== "all") {
                setActiveTab(key);
                setFilters(defaultTaskFilters);
              }
            }}
          />
        </div>

        {isCrossTabDragging ? (
          <div className="dashboard-board-content relative z-10 min-h-0 flex-1 overflow-y-auto">
            {mountedTabSlugs.map((slug) => {
              const tab = normalizedTabs.find((item) => item.slug === slug);
              if (!tab) return null;
              const isVisible = slug === activeTab;
              return (
                <TabBoardPanel
                  key={slug}
                  tab={tab}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onTaskClick={(task) => setSelectedTask(task)}
                  className={
                    isVisible
                      ? "p-3 sm:p-5"
                      : "pointer-events-none fixed top-0 -left-[10000px] w-[min(100vw,1200px)] opacity-0"
                  }
                  ariaHidden={!isVisible}
                />
              );
            })}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="dashboard-board-content relative z-10 min-h-0 flex-1 overflow-y-auto p-3 sm:p-5"
            >
              <TabBoardPanel
                tab={selected}
                filters={filters}
                onFiltersChange={setFilters}
                onTaskClick={(task) => setSelectedTask(task)}
              />
            </motion.div>
          </AnimatePresence>
        )}
        </motion.div>

        <div className="flex w-[15rem] shrink-0 flex-col self-stretch">
          <DailyPlanSidebar accentHex={accentHex} />
        </div>
      </div>
      </TaskDragDropProvider>
      {selectedTask ? (
        <TaskDetailsModal
          open={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
        />
      ) : null}
      </div>
    </section>
  );
}

interface TabBoardPanelProps {
  tab: MainTabItem;
  filters: TaskFilterState;
  onFiltersChange: (state: TaskFilterState) => void;
  onTaskClick: (task: { id: string; title: string }) => void;
  className?: string;
  ariaHidden?: boolean;
}

function TabBoardPanel({ tab, filters, onFiltersChange, onTaskClick, className = "", ariaHidden }: TabBoardPanelProps) {
  const tabFilter = useMemo(() => new TabTaskFilter(tab.sections), [tab.sections]);
  const filteredSections = useMemo(() => tabFilter.apply(filters), [tabFilter, filters]);
  const sectionsLayoutClass =
    tab.slug === "general"
      ? "grid grid-cols-1 items-start gap-3 sm:gap-4"
      : "grid items-start gap-3 sm:gap-4 xl:grid-cols-3";

  return (
    <div className={className} aria-hidden={ariaHidden}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 sm:mb-4 sm:gap-3">
        <h2 className="text-lg font-semibold text-text-primary sm:text-xl">סקציות ופרויקטים</h2>
        <div className="flex items-center gap-2">
          <CreateProjectDrawer
            triggerLabel="פרויקט חדש בטאב"
            allowedDomainId={tab.id}
            allowedDomainSlug={tab.slug}
          />
        </div>
      </div>
      <div className="mb-3 sm:mb-4">
        <TaskFilterBar
          state={filters}
          onChange={onFiltersChange}
          subtopicOptions={tabFilter.subtopicOptions}
          projectOptions={tabFilter.projectOptions}
          assigneeOptions={tabFilter.assigneeOptions}
        />
      </div>
      {filteredSections.length === 0 ? (
        <div className="rounded-2xl bg-surface-2/60 px-4 py-10 text-center text-sm font-medium text-text-secondary">
          לא נמצאו משימות התואמות לסינון.
        </div>
      ) : (
        <div className={sectionsLayoutClass}>
          {filteredSections.map((section) => (
            <SectionGroup
              key={section.id}
              section={section}
              domainSlug={tab.slug}
              toneClass={tabMeta[tab.slug].contentClass}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
