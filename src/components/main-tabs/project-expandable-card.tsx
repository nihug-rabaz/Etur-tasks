"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, FolderKanban } from "lucide-react";
import { useState } from "react";
import { TabProjectItem } from "@/services/dashboard.service";
import { CreateTaskDrawer } from "@/components/create-task-drawer";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { TaskRowItem } from "@/components/main-tabs/task-row-item";
import { useTaskDragDrop } from "@/components/main-tabs/task-drag-drop-context";

interface ProjectExpandableCardProps {
  project: TabProjectItem;
  toneClass: string;
  onTaskClick: (task: { id: string; title: string }) => void;
}

export function ProjectExpandableCard({ project, toneClass, onTaskClick }: ProjectExpandableCardProps) {
  const [open, setOpen] = useState(false);
  const { dragTask, dropTargetProjectId, setDropTarget, moveTaskToProject, endDrag } = useTaskDragDrop();
  const isDragging = Boolean(dragTask);
  const isValidDropTarget = Boolean(dragTask && dragTask.sourceProjectId !== project.id);
  const isDropHover = isValidDropTarget && dropTargetProjectId === project.id;

  const handleDragOver = (event: React.DragEvent) => {
    if (!isValidDropTarget) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(project.id);
  };

  // Clearing on leave causes flicker between cards; drop target is cleared on drag end instead.
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!dragTask || dragTask.sourceProjectId === project.id) {
      endDrag();
      return;
    }
    moveTaskToProject(dragTask.id, project.id);
  };

  return (
    <article
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDrop={handleDrop}
      className={`overflow-hidden rounded-2xl bg-surface-2/60 shadow-sm transition-[box-shadow] duration-200 ${
        isDragging ? "" : "hover:-translate-y-0.5 hover:shadow-md"
      } ${isDropHover ? "ring-2 ring-accent-primary/55" : ""} ${toneClass}`}
    >
      <div className="relative flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="relative flex w-full min-w-0 flex-1 items-start gap-2.5 overflow-hidden text-start transition sm:items-center sm:justify-between sm:gap-3"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2/90 text-text-secondary">
              <FolderKanban size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold leading-snug text-text-primary [overflow-wrap:anywhere] sm:truncate sm:[overflow-wrap:normal]">
                {project.name}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-text-muted sm:mt-0">
                {project.tasks.length} משימות בפרויקט
              </span>
            </span>
          </span>
          <ChevronDown
            size={18}
            className={`mt-1 shrink-0 text-text-secondary transition-transform duration-200 sm:mt-0 ${open ? "rotate-180" : ""}`}
          />
        </button>

        <span className="flex items-center justify-end gap-1.5 border-t border-border-weak/60 pt-2 sm:inline-flex sm:shrink-0 sm:items-center sm:gap-2 sm:border-t-0 sm:pt-0">
          <CreateTaskDrawer
            defaultSubtopicId={project.sectionId}
            defaultProjectId={project.id}
            iconOnly
          />
          <DeleteProjectButton projectId={project.id} iconOnly />
          <Link
            href={`/projects/${project.id}`}
            title="מעבר לפרויקט"
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-accent-primary/25 bg-accent-primary/15 px-2.5 py-2 text-xs font-bold text-accent-primary transition hover:bg-accent-primary/25 sm:rounded-lg sm:border-0 sm:bg-accent-primary/12 sm:px-2 sm:py-1 sm:font-semibold sm:hover:bg-accent-primary/20"
          >
            <span className="sm:hidden">לפרויקט</span>
            <span className="hidden sm:inline">מעבר לפרויקט</span>
            <ExternalLink size={14} strokeWidth={2.5} className="shrink-0 sm:hidden" />
            <ExternalLink size={11} className="ms-1 hidden sm:inline" />
          </Link>
        </span>

        <div
          aria-hidden={!isDropHover}
          className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-accent-primary/12 transition-opacity duration-150 ${
            isDropHover ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="rounded-full bg-accent-primary px-4 py-2 text-sm font-extrabold text-white shadow-[0_10px_30px_-8px_rgba(14,165,233,0.75)]">
            העברה לפרויקט
          </span>
        </div>
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
              {project.tasks.length === 0 ? (
                <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-text-muted">
                  אין עדיין משימות בפרויקט הזה.
                </p>
              ) : (
                project.tasks.map((task) => (
                  <TaskRowItem
                    key={task.id}
                    task={task}
                    projectId={project.id}
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
