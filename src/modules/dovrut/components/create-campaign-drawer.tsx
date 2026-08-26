"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { CampaignCreateForm, CampaignForm } from "@/modules/dovrut/components/forms/campaign-form";
import type { DovrutCampaign } from "@/modules/dovrut/types";

export function CreateCampaignDrawer({
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
          className="inline-flex w-fit items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(124,58,237,0.55)] transition hover:brightness-105"
        >
          קמפיין
          <Plus size={16} />
        </button>
      )}
      <Drawer open={open} onClose={() => setOpen(false)} title="קמפיין חדש">
        <CampaignCreateForm
          onCreated={() => {
            setOpen(false);
            onCreated?.();
          }}
        />
      </Drawer>
    </>
  );
}

export function EditCampaignDrawer({
  campaign,
  open,
  onOpenChange,
  onSaved,
}: {
  campaign: DovrutCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  return (
    <Drawer
      open={open && Boolean(campaign)}
      onClose={() => onOpenChange(false)}
      title="עריכת קמפיין"
      subtitle={campaign?.name}
    >
      {campaign ? (
        <CampaignForm
          campaign={campaign}
          onSaved={() => {
            onOpenChange(false);
            onSaved?.();
          }}
        />
      ) : null}
    </Drawer>
  );
}
