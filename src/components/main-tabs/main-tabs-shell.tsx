"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, LayoutGrid, Megaphone, Radar } from "lucide-react";
import { ComponentType, useMemo, useState } from "react";
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
import { TaskDetailsModal } from "@/components/task-details-modal";
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
  recruitment: ["קצינים", "נגדים", "מלש״בים"],
  positioning: ["יח״צ", "סושיאל", "ביקורים"],
  general: ["כללי"],
};

export function MainTabsShell({ tabs }: MainTabsShellProps) {
  const initialTab = tabs[0]?.slug ?? "recruitment";
  const [activeTab, setActiveTab] = useState<TabSlug>(initialTab);
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);

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
          mergedByName.set(section.name, { ...section, projects: [...section.projects] });
          continue;
        }
        mergedByName.set(section.name, {
          ...existing,
          projects: [...existing.projects, ...section.projects],
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
  const sectionsLayoutClass =
    selected?.slug === "general"
      ? "grid grid-cols-1 items-start gap-3 sm:gap-4"
      : "grid items-start gap-3 sm:gap-4 xl:grid-cols-3";
  const accentHex = domainMeta[(selected?.slug ?? "general") as DomainKey]?.accentHex ?? "#8b5cf6";

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

      <div className="relative z-10 mx-auto flex h-[calc(100dvh-4rem)] min-h-[32rem] w-[94%] max-w-[2000px] flex-col gap-4 pb-4 pt-3 sm:gap-5 sm:pb-5 sm:pt-5">
      <div className="flex flex-col gap-3 px-1 sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition-all duration-500 sm:h-[3.25rem] sm:w-[3.25rem]"
              style={{ backgroundColor: accentHex, boxShadow: `0 14px 30px -8px ${accentHex}` }}
            >
              <LayoutGrid size={24} />
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

      <motion.div
        className="dashboard-glass-board relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl transition-shadow duration-700 sm:rounded-[2rem]"
        style={{ boxShadow: `0 40px 90px -28px ${accentHex}80, 0 18px 55px -22px ${accentHex}59` }}
      >
        <div className="dashboard-tabs-bar relative z-10 shrink-0 px-2 pt-2 sm:px-6 sm:pt-3">
          <DomainTopicTabs
            active={activeTab}
            showAll={false}
            counts={Object.fromEntries(
              normalizedTabs.map((tab) => [tab.slug, tab.sections.length]),
            ) as Partial<Record<DomainKey, number>>}
            onChange={(key) => {
              if (key !== "all") setActiveTab(key);
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selected.slug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="dashboard-board-content relative z-10 min-h-0 flex-1 overflow-y-auto p-3 sm:p-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 sm:mb-4 sm:gap-3">
              <h2 className="text-lg font-semibold text-text-primary sm:text-xl">סקציות ופרויקטים</h2>
              <div className="flex items-center gap-2">
                <CreateProjectDrawer
                  triggerLabel="פרויקט חדש בטאב"
                  allowedDomainId={selected.id}
                  allowedDomainSlug={selected.slug}
                />
              </div>
            </div>
            <div className={sectionsLayoutClass}>
              {selected.sections.map((section) => (
                <SectionGroup
                  key={section.id}
                  section={section}
                  domainSlug={selected.slug}
                  toneClass={tabMeta[selected.slug].contentClass}
                  onTaskClick={(task) => setSelectedTask(task)}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
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
