"use client";

import { BriefcaseBusiness, Megaphone, Radar } from "lucide-react";
import { ComponentType } from "react";
import { domainKeys, domainMeta, type DomainKey } from "@/lib/ui/domains";

const domainIcons: Record<DomainKey, ComponentType<{ size?: number; className?: string }>> = {
  recruitment: Radar,
  positioning: Megaphone,
  general: BriefcaseBusiness,
};

interface DomainTopicTabsProps {
  active: DomainKey | "all";
  counts?: Partial<Record<DomainKey, number>>;
  onChange: (key: DomainKey | "all") => void;
  showAll?: boolean;
}

export function DomainTopicTabs({ active, counts, onChange, showAll = true }: DomainTopicTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="תחומים">
      {showAll ? (
        <button
          type="button"
          role="tab"
          aria-selected={active === "all"}
          onClick={() => onChange("all")}
          className={`flex min-w-max items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition ${
            active === "all"
              ? "border-accent-primary bg-accent-primary text-white shadow-[0_8px_24px_rgba(79,70,229,0.35)]"
              : "border-border-weak bg-surface-1 text-text-secondary hover:border-accent-primary/40"
          }`}
        >
          הכל
        </button>
      ) : null}
      {domainKeys.map((key) => {
        const meta = domainMeta[key];
        const Icon = domainIcons[key];
        const selected = active === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition sm:min-w-[8.5rem] ${
              selected ? `${meta.tabActive} text-white shadow-lg` : meta.tabIdle
            }`}
          >
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                selected ? "bg-white/20 text-white" : "bg-white/80 dark:bg-black/20"
              }`}
            >
              <Icon size={15} />
            </span>
            <span>{meta.label}</span>
            {counts?.[key] !== undefined ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  selected ? "bg-black/20 text-white" : "bg-surface-2 text-text-muted"
                }`}
              >
                {counts[key]}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
