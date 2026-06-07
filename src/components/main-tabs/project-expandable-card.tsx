"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, FolderKanban } from "lucide-react";
import { useState } from "react";
import { TabProjectItem } from "@/services/dashboard.service";
import { CreateTaskDrawer } from "@/components/create-task-drawer";
import { TaskRowItem } from "@/components/main-tabs/task-row-item";

interface ProjectExpandableCardProps {
  project: TabProjectItem;
  toneClass: string;
  onTaskClick: (task: { id: string; title: string }) => void;
}

export function ProjectExpandableCard({ project, toneClass, onTaskClick }: ProjectExpandableCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <article className={`overflow-hidden rounded-2xl bg-surface-2/60 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${toneClass}`}>
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-start"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2/90 text-text-secondary">
              <FolderKanban size={14} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-text-primary">{project.name}</span>
              <span className="text-xs font-medium text-text-muted">{project.tasks.length} משימות בפרויקט</span>
            </span>
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        <span className="inline-flex shrink-0 items-center gap-2">
          <CreateTaskDrawer
            defaultSubtopicId={project.sectionId}
            defaultProjectId={project.id}
            iconOnly
          />
          <Link
            href={`/projects/${project.id}`}
            className="rounded-lg bg-accent-primary/12 px-2 py-1 text-xs font-semibold text-accent-primary transition hover:bg-accent-primary/20"
          >
            מעבר לפרויקט
            <ExternalLink size={11} className="ms-1 inline" />
          </Link>
        </span>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="bg-surface-1/60"
          >
            <div className="space-y-2 p-3 ps-6">
              {project.tasks.length === 0 ? (
                <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-text-muted">
                  אין עדיין משימות בפרויקט הזה.
                </p>
              ) : (
                project.tasks.map((task) => (
                  <TaskRowItem
                    key={task.id}
                    task={task}
                    onClick={() => {
                      onTaskClick({ id: task.id, title: task.title });
                    }}
                  />
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}
