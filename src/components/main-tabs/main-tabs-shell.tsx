"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, Megaphone, Radar, Search } from "lucide-react";
import { ComponentType, useMemo, useState } from "react";
import { MainTabItem } from "@/services/dashboard.service";
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
      ? "grid grid-cols-1 items-start gap-4"
      : "grid items-start gap-4 xl:grid-cols-3";

  if (!selected) {
    return (
      <section className="rounded-3xl border border-border-weak bg-surface-1/70 p-6">
        <p className="text-text-secondary">אין נתונים להצגה כרגע.</p>
      </section>
    );
  }

  return (
    <section className="relative isolate flex min-h-full flex-1 flex-col overflow-hidden rounded-[2rem] p-1 sm:p-2">
      <DashboardAmbientBackground theme={selected.slug as DashboardAmbientTheme} />

      <div className="relative z-10 flex min-h-full flex-1 flex-col gap-6">
      <div className="dashboard-glass glow-ring shrink-0 rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
          <div className="min-w-0 shrink-0 lg:max-w-[min(100%,22rem)]">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">פרויקטים ומשימות</h1>
          </div>
          <div className="min-w-0 flex-1 lg:flex lg:justify-center">
            <div className="relative flex w-full max-w-xl items-center lg:mx-auto">
              <Search
                size={18}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-muted"
                aria-hidden
              />
              <input
                type="search"
                aria-label="חיפוש משימות, פרויקטים או משתמשים"
                placeholder="חיפוש משימות, פרויקטים או משתמשים..."
                className="w-full rounded-2xl border border-border-weak bg-white py-2.5 ps-10 pe-3 text-sm text-text-primary outline-none transition focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/30 dark:bg-[#182238]"
              />
            </div>
          </div>
          <div className="shrink-0 self-start lg:self-auto">
            <CreateTaskDrawer triggerLabel="יצירה מהירה" compact />
          </div>
        </div>
      </div>

      <motion.div
        className={`dashboard-glass-board relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl ${tabMeta[selected.slug].contentClass}`}
      >
        <div className="dashboard-tabs-bar relative z-10 shrink-0 border-b p-3">
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
            className="dashboard-board-content relative z-10 flex-1 p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-text-primary">סקציות ופרויקטים</h2>
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
