"use client";

import { motion } from "framer-motion";
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
    <div className="flex w-full items-stretch gap-1 sm:gap-5" role="tablist" aria-label="תחומים">
      {showAll ? (
        <Tab
          label="הכל"
          selected={active === "all"}
          accentHex="var(--accent-primary)"
          onClick={() => onChange("all")}
          indicatorId="domain-tab-indicator"
        />
      ) : null}
      {domainKeys.map((key) => {
        const meta = domainMeta[key];
        const Icon = domainIcons[key];
        return (
          <Tab
            key={key}
            label={meta.label}
            icon={<Icon size={20} />}
            count={counts?.[key]}
            selected={active === key}
            accentHex={meta.accentHex}
            onClick={() => onChange(key)}
            indicatorId="domain-tab-indicator"
          />
        );
      })}
    </div>
  );
}

interface TabProps {
  label: string;
  icon?: React.ReactNode;
  count?: number;
  selected: boolean;
  accentHex: string;
  onClick: () => void;
  indicatorId: string;
}

function Tab({ label, icon, count, selected, accentHex, onClick, indicatorId }: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      style={selected ? { color: accentHex } : undefined}
      className={`relative flex flex-1 items-center justify-center gap-2 rounded-t-xl px-2 py-3 text-base font-extrabold transition sm:gap-3 sm:px-6 sm:py-4 sm:text-xl ${
        selected ? "" : "text-text-muted hover:text-text-secondary"
      }`}
    >
      {icon ? (
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition sm:h-10 sm:w-10 sm:rounded-xl"
          style={selected ? { backgroundColor: `${accentHex}1f`, color: accentHex } : undefined}
        >
          {icon}
        </span>
      ) : null}
      <span className="truncate">{label}</span>
      {count !== undefined ? (
        <span
          className="hidden rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums sm:inline-block sm:px-3 sm:text-sm"
          style={
            selected
              ? { backgroundColor: `${accentHex}1f`, color: accentHex }
              : { backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }
          }
        >
          {count}
        </span>
      ) : null}
      {selected ? (
        <motion.span
          layoutId={indicatorId}
          className="absolute inset-x-3 -bottom-px h-[3px] rounded-full"
          style={{ backgroundColor: accentHex }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      ) : null}
    </button>
  );
}
