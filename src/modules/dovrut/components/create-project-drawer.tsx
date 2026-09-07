"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { ProjectCreateForm } from "@/modules/dovrut/components/forms/project-form";

export function CreateProjectDrawer({
  onCreated,
  hideTrigger = false,
  open: openProp,
  onOpenChange,
}: {
  onCreated?: () => void;
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          dir="rtl"
          onClick={() => setOpen(true)}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-cyan px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(34,184,207,0.55)] transition hover:brightness-105"
        >
          פרויקט
          <Plus size={16} />
        </button>
      )}
      <Drawer open={open} onClose={() => setOpen(false)} title="פרויקט חדש">
        <ProjectCreateForm
          onCreated={() => {
            setOpen(false);
            onCreated?.();
          }}
        />
      </Drawer>
    </>
  );
}
