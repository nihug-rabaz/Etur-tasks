"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ListTodo } from "lucide-react";
import { useState } from "react";
import { TabTaskItem } from "@/services/dashboard.service";
import { CreateTaskDrawer } from "@/components/create-task-drawer";
import { TaskRowItem } from "@/components/main-tabs/task-row-item";

interface StandaloneTasksCardProps {
  sectionId: string;
  tasks: TabTaskItem[];
  toneClass: string;
  onTaskClick: (task: { id: string; title: string }) => void;
}

export function StandaloneTasksCard({
  sectionId,
  tasks,
  toneClass,
  onTaskClick,
}: StandaloneTasksCardProps) {
  const [open, setOpen] = useState(false);
  const dragProjectId = `standalone-${sectionId}`;

  return (
    <article
      className={`overflow-hidden rounded-2xl bg-surface-2/60 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${toneClass}`}
    >
      <div className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full min-w-0 flex-1 items-start gap-2.5 text-start sm:items-center sm:justify-between sm:gap-3"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2/90 text-text-secondary">
              <ListTodo size={14} />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold text-text-primary">משימות ללא פרויקט</span>
              <span className="text-xs font-medium text-text-muted">{tasks.length} משימות עצמאיות</span>
            </span>
          </span>
          <ChevronDown
            size={18}
            className={`mt-1 shrink-0 text-text-secondary transition-transform duration-200 sm:mt-0 ${open ? "rotate-180" : ""}`}
          />
        </button>
        <span className="flex justify-end border-t border-border-weak/60 pt-2 sm:inline-flex sm:shrink-0 sm:border-t-0 sm:pt-0">
          <CreateTaskDrawer defaultSubtopicId={sectionId} iconOnly />
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
            <div className="space-y-2 p-3 ps-4 sm:ps-6">
              {tasks.map((task) => (
                <TaskRowItem
                  key={task.id}
                  task={task}
                  projectId={dragProjectId}
                  onClick={() => onTaskClick({ id: task.id, title: task.title })}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}
