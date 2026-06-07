"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft, FolderTree, Layers, Target } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { HierarchyCategoryNode } from "@/services/dashboard.service";

interface HierarchyExplorerProps {
  categories: HierarchyCategoryNode[];
}

export function HierarchyExplorer({ categories }: HierarchyExplorerProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<string>("");

  const totalNodes = useMemo(() => {
    let total = 0;
    for (const category of categories) {
      total += 1 + category.mainTasks.length;
      for (const mainTask of category.mainTasks) {
        total += mainTask.subMainTasks.length;
        for (const subMain of mainTask.subMainTasks) {
          total += subMain.projects.length + subMain.standaloneTasks.length;
          for (const project of subMain.projects) total += project.tasks.length;
        }
      }
    }
    return total;
  }, [categories]);

  const toggle = (id: string) => setOpenIds((state) => ({ ...state, [id]: !state[id] }));

  return (
    <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
      <div className="rounded-3xl border border-border-weak bg-surface-1/80 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary">סייר היררכיה</h1>
          <span className="rounded-full border border-border-weak bg-surface-2/70 px-3 py-1 text-xs text-text-secondary">
            {totalNodes} צמתים
          </span>
        </div>
        <div className="space-y-2">
          {categories.map((category) => (
            <TreeRow
              key={category.id}
              id={category.id}
              label={category.name}
              level={0}
              selectedNode={selectedNode}
              isOpen={!!openIds[category.id]}
              onToggle={() => toggle(category.id)}
              onSelect={() => setSelectedNode(category.id)}
            >
              {category.mainTasks.map((mainTask) => (
                <TreeRow
                  key={mainTask.id}
                  id={mainTask.id}
                  label={`משימה ראשית: ${mainTask.name}`}
                  level={1}
                  selectedNode={selectedNode}
                  isOpen={!!openIds[mainTask.id]}
                  onToggle={() => toggle(mainTask.id)}
                  onSelect={() => setSelectedNode(mainTask.id)}
                >
                  {mainTask.subMainTasks.map((subMainTask) => (
                    <TreeRow
                      key={subMainTask.id}
                      id={subMainTask.id}
                      label={`תת-משימה ראשית: ${subMainTask.name}`}
                      level={2}
                      selectedNode={selectedNode}
                      isOpen={!!openIds[subMainTask.id]}
                      onToggle={() => toggle(subMainTask.id)}
                      onSelect={() => setSelectedNode(subMainTask.id)}
                    >
                      {subMainTask.projects.map((project) => (
                        <TreeRow
                          key={project.id}
                          id={project.id}
                          label={`פרויקט: ${project.name}`}
                          level={3}
                          selectedNode={selectedNode}
                          isOpen={!!openIds[project.id]}
                          onToggle={() => toggle(project.id)}
                          onSelect={() => setSelectedNode(project.id)}
                        >
                          {project.tasks.map((task) => (
                            <LeafRow
                              key={task.id}
                              id={task.id}
                              label={`משימה: ${task.title}`}
                              level={4}
                              selectedNode={selectedNode}
                              onSelect={() => setSelectedNode(task.id)}
                            />
                          ))}
                        </TreeRow>
                      ))}
                      {subMainTask.standaloneTasks.map((task) => (
                        <LeafRow
                          key={task.id}
                          id={task.id}
                          label={`משימה: ${task.title}`}
                          level={3}
                          selectedNode={selectedNode}
                          onSelect={() => setSelectedNode(task.id)}
                        />
                      ))}
                    </TreeRow>
                  ))}
                </TreeRow>
              ))}
            </TreeRow>
          ))}
        </div>
      </div>

      <aside className="rounded-3xl border border-border-weak bg-surface-1/80 p-4">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">לוח הקשר</h2>
        <div className="space-y-3">
          <div className="rounded-2xl border border-border-weak bg-surface-2/70 p-3">
            <p className="text-xs text-text-muted">צומת נבחר</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{selectedNode || "בחרו צומת מהעץ"}</p>
          </div>
          <div className="rounded-2xl border border-border-weak bg-surface-2/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
              <FolderTree size={14} />
              קשרים היררכיים
            </div>
            <p className="text-xs text-text-muted">מעבר עכבר ופתיחה מדגישים את היחסים בין כל הרמות.</p>
          </div>
          <div className="rounded-2xl border border-border-weak bg-surface-2/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
              <Layers size={14} />
              מסננים פעילים
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-accent-primary/40 bg-accent-primary/10 px-2 py-0.5 text-accent-primary">סטטוס</span>
              <span className="rounded-full border border-accent-secondary/40 bg-accent-secondary/10 px-2 py-0.5 text-accent-secondary">עדיפות</span>
              <span className="rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-2 py-0.5 text-accent-cyan">אחראי</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border-weak bg-surface-2/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
              <Target size={14} />
              פעולה מהירה
            </div>
            <button className="w-full rounded-xl border border-accent-primary/50 bg-accent-primary/15 px-3 py-2 text-sm font-semibold text-accent-primary transition hover:bg-accent-primary/25">
              יצירה מהירה בצומת הנבחר
            </button>
          </div>
        </div>
      </aside>
    </section>
  );
}

function TreeRow({
  id,
  label,
  level,
  selectedNode,
  isOpen,
  onToggle,
  onSelect,
  children,
}: {
  id: string;
  label: string;
  level: number;
  selectedNode: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onToggle();
          onSelect();
        }}
        className={`group flex w-full items-center rounded-xl border px-3 py-2 text-start transition ${
          selectedNode === id
            ? "border-accent-primary/70 bg-accent-primary/15"
            : "border-border-weak bg-surface-2/60 hover:border-accent-primary/40 hover:bg-surface-2/85"
        }`}
        style={{ marginInlineStart: `${level * 14}px` }}
      >
        <span className="me-2 inline-flex h-5 w-5 items-center justify-center rounded-md border border-border-weak bg-surface-1 text-text-secondary">
          {isOpen ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
        </span>
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26 }}
            className="mt-1 border-s border-border-weak/80"
          >
            <div className="space-y-2 ps-2">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function LeafRow({
  id,
  label,
  level,
  selectedNode,
  onSelect,
}: {
  id: string;
  label: string;
  level: number;
  selectedNode: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ marginInlineStart: `${level * 14}px` }}
      className={`flex w-full items-center rounded-xl border px-3 py-2 text-start text-sm transition ${
        selectedNode === id
          ? "border-accent-cyan/70 bg-accent-cyan/15 text-text-primary"
          : "border-border-weak bg-surface-2/60 text-text-secondary hover:border-accent-cyan/40 hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}
