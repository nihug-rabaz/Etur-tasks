"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { ItemCreateForm } from "@/modules/dovrut/components/forms/item-form";

export function CreateItemDrawer({
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
          className="inline-flex w-fit items-center gap-2 rounded-full bg-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(192,38,211,0.55)] transition hover:brightness-105"
        >
          אייטם
          <Plus size={16} />
        </button>
      )}
      <Drawer open={open} onClose={() => setOpen(false)} title="אייטם חדש">
        <ItemCreateForm
          onCreated={() => {
            setOpen(false);
            onCreated?.();
          }}
        />
      </Drawer>
    </>
  );
}
