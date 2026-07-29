"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useDomainTabAppearance } from "@/hooks/use-domain-tab-appearance";
import { useOptionalTaskDragDrop } from "@/components/main-tabs/task-drag-drop-context";
import { resolveDomainTabIcon } from "@/lib/ui/domain-tab-appearance";
import { domainKeys, domainMeta, type DomainKey } from "@/lib/ui/domains";

interface DomainTopicTabsProps {
  active: DomainKey | "all";
  counts?: Partial<Record<DomainKey, number>>;
  onChange: (key: DomainKey | "all") => void;
  showAll?: boolean;
}

export function DomainTopicTabs({ active, counts, onChange, showAll = true }: DomainTopicTabsProps) {
  const appearance = useDomainTabAppearance();
  const dragDrop = useOptionalTaskDragDrop();
  const isDragging = Boolean(dragDrop?.dragTask);

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
        const item = appearance[key];
        const Icon = resolveDomainTabIcon(item.icon);
        const isValidDropTarget = Boolean(
          dragDrop?.dragTask && dragDrop.dragTask.sourceDomainSlug !== key,
        );
        const isDropHover = isValidDropTarget && dragDrop?.dropTargetDomainSlug === key;
        const dropHint = isDropHover
          ? active === key
            ? `העברה ל${meta.label}`
            : `מעבר לטאב ${meta.label}`
          : undefined;

        return (
          <Tab
            key={key}
            label={meta.label}
            media={
              item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={meta.label}
                  width={56}
                  height={56}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icon size={22} />
              )
            }
            mediaIsImage={Boolean(item.imageUrl)}
            count={counts?.[key]}
            selected={active === key}
            accentHex={meta.accentHex}
            onClick={() => onChange(key)}
            indicatorId="domain-tab-indicator"
            isDragging={isDragging}
            isDropHover={isDropHover}
            dropHint={dropHint}
            onDragOver={(event) => {
              if (!isValidDropTarget || !dragDrop) return;
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = "move";
              dragDrop.setDropTargetDomain(key);
              dragDrop.scheduleTabSwitch(key, active);
            }}
            onDragLeave={(event) => {
              if (!dragDrop || dragDrop.dropTargetDomainSlug !== key) return;
              const next = event.relatedTarget;
              if (next instanceof Node && event.currentTarget.contains(next)) return;
              dragDrop.setDropTargetDomain(null);
              dragDrop.cancelTabSwitch();
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!dragDrop?.dragTask || dragDrop.dragTask.sourceDomainSlug === key) {
                dragDrop?.endDrag();
                return;
              }
              dragDrop.moveTaskToDomain(dragDrop.dragTask.id, key);
            }}
          />
        );
      })}
    </div>
  );
}

interface TabProps {
  label: string;
  media?: React.ReactNode;
  mediaIsImage?: boolean;
  count?: number;
  selected: boolean;
  accentHex: string;
  onClick: () => void;
  indicatorId: string;
  isDragging?: boolean;
  isDropHover?: boolean;
  dropHint?: string;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
}

function Tab({
  label,
  media,
  mediaIsImage = false,
  count,
  selected,
  accentHex,
  onClick,
  indicatorId,
  isDragging = false,
  isDropHover = false,
  dropHint,
  onDragOver,
  onDragLeave,
  onDrop,
}: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={selected ? { color: accentHex } : undefined}
      className={`relative flex flex-1 items-center justify-center gap-2 rounded-t-xl px-2 py-3 text-base font-extrabold transition sm:gap-3 sm:px-6 sm:py-4 sm:text-xl ${
        selected ? "" : "text-text-muted hover:text-text-secondary"
      } ${isDropHover ? "ring-2 ring-accent-primary/55 ring-offset-2 ring-offset-surface-1/80" : ""} ${
        isDragging && onDragOver ? "cursor-copy" : ""
      }`}
    >
      {media ? (
        <span
          className={`inline-flex shrink-0 items-center justify-center overflow-hidden transition ${
            mediaIsImage
              ? "h-11 w-11 rounded-full ring-2 ring-white/70 shadow-md sm:h-14 sm:w-14"
              : "h-9 w-9 rounded-xl sm:h-11 sm:w-11 sm:rounded-xl"
          }`}
          style={selected ? { backgroundColor: mediaIsImage ? undefined : `${accentHex}1f`, color: accentHex } : undefined}
        >
          {media}
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
      {dropHint ? (
        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-t-xl bg-accent-primary/14 backdrop-blur-[1px]">
          <span className="rounded-full bg-accent-primary px-3 py-1.5 text-xs font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(14,165,233,0.75)] sm:text-sm">
            {dropHint}
          </span>
        </span>
      ) : null}
    </button>
  );
}
