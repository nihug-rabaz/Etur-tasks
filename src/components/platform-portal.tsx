"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  listAccessibleModules,
  type ModuleAccessContext,
  type ModuleRole,
} from "@/shared/modules/registry";
import { writeLastModuleId } from "@/shared/modules/last-module";

type PortalSlot = "tl" | "tr" | "bl" | "br" | "tasks" | "snacks";

type PortalZone = {
  id: string;
  label: string;
  detail: string;
  href: string | null;
  layer: string;
  slot: PortalSlot;
};

const ZONES: PortalZone[] = [
  {
    id: "nagadim",
    label: "נגדים",
    detail: "מיצוב וליווי",
    href: "/nagadim",
    layer: "/intro/portal/beret-hd.png",
    slot: "tl",
  },
  {
    id: "malshabim",
    label: "מלש״בים",
    detail: "ראיונות ומעקב",
    href: "/malshabim",
    layer: "/intro/portal/soldiers-bags-hd.png",
    slot: "tr",
  },
  {
    id: "agam",
    label: "קצינים",
    detail: "מיון ואיתור",
    href: "/agam",
    layer: "/intro/portal/bahad1-hd.png",
    slot: "bl",
  },
  {
    id: "dovrut",
    label: "דוברות",
    detail: "תוכן ואישורים",
    href: "/dovrut",
    layer: "/intro/portal/newspapers-hd.png",
    slot: "br",
  },
  {
    id: "tasks",
    label: "משימות",
    detail: "TODO LIST",
    href: "/dashboard",
    layer: "/intro/portal/todo-list-hd.png",
    slot: "tasks",
  },
  {
    id: "snacks",
    label: "חטיפים",
    detail: "בקרוב",
    href: null,
    layer: "/intro/portal/snacks-hd.png",
    slot: "snacks",
  },
];

const SLOT_ORDER: PortalSlot[] = ["tl", "tr", "bl", "br", "tasks", "snacks"];

function moduleEntryHref(moduleId: string, href: string, role?: ModuleRole): string {
  if (moduleId === "dovrut" && role === "approver") return "/dovrut/approvals";
  return href;
}

export function PlatformPortal({
  isPlatformAdmin,
  moduleRoles = {},
  onNavigate,
  variant = "page",
}: {
  isPlatformAdmin: boolean;
  moduleRoles?: Record<string, ModuleRole>;
  onNavigate?: () => void;
  variant?: "page" | "overlay";
}) {
  const [hotSlot, setHotSlot] = useState<PortalSlot | null>(null);

  const access: ModuleAccessContext = useMemo(
    () => ({ isPlatformAdmin, moduleRoles }),
    [isPlatformAdmin, moduleRoles],
  );

  const accessibleIds = useMemo(
    () => new Set(listAccessibleModules(access).map((module) => module.id)),
    [access],
  );

  const zones = ZONES.map((zone) => {
    const isPlaceholder = zone.href === null;
    return {
      ...zone,
      href: isPlaceholder
        ? null
        : moduleEntryHref(zone.id, zone.href!, moduleRoles[zone.id]),
      open:
        isPlaceholder ||
        variant === "overlay" ||
        accessibleIds.size === 0 ||
        accessibleIds.has(zone.id),
      placeholder: isPlaceholder,
    };
  });

  const bySlot = Object.fromEntries(zones.map((zone) => [zone.slot, zone])) as Record<
    PortalSlot,
    (typeof zones)[number]
  >;

  return (
    <div
      className={`platform-portal ${variant === "overlay" ? "platform-portal--overlay" : ""}`}
    >
      <div
        className={[
          "platform-portal__stage",
          hotSlot ? `platform-portal__stage--hot-${hotSlot}` : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="platform-portal__bg" aria-hidden />

        {SLOT_ORDER.map((slot, index) => {
          const zone = bySlot[slot];
          return (
            <div
              key={`layer-${zone.id}`}
              className={`platform-portal__layer platform-portal__layer--${slot}`}
              style={{ ["--portal-delay" as string]: `${140 + index * 80}ms` }}
              aria-hidden
            >
              <div
                className={[
                  "platform-portal__art-wrap",
                  slot === "snacks" ? "platform-portal__art-wrap--snacks" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Image
                  src={zone.layer}
                  alt=""
                  fill
                  sizes="100vw"
                  quality={95}
                  priority
                  className="platform-portal__art"
                />
              </div>
            </div>
          );
        })}

        <div className="platform-portal__glow" aria-hidden>
          <Image
            src="/intro/portal/glow.png"
            alt=""
            fill
            sizes="100vw"
            priority
            className="platform-portal__art"
          />
        </div>

        <div className="platform-portal__center" aria-hidden>
          <Image
            src="/intro/portal/emblem-stone.png"
            alt=""
            width={840}
            height={830}
            quality={95}
            priority
            className="platform-portal__emblem"
          />
        </div>

        {zones.map((zone) => {
          const className = [
            "platform-portal__zone",
            `platform-portal__zone--${zone.slot}`,
            zone.open ? "" : "platform-portal__zone--locked",
            zone.placeholder ? "platform-portal__zone--soon" : "",
            hotSlot === zone.slot ? "is-hot" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const label = (
            <span className="platform-portal__zone-copy">
              <span className="platform-portal__zone-label">{zone.label}</span>
            </span>
          );

          const handlers = {
            onMouseEnter: () => setHotSlot(zone.slot),
            onMouseLeave: () => setHotSlot((current) => (current === zone.slot ? null : current)),
            onFocus: () => setHotSlot(zone.slot),
            onBlur: () => setHotSlot((current) => (current === zone.slot ? null : current)),
            onTouchStart: () => setHotSlot(zone.slot),
          };

          if (zone.placeholder) {
            return (
              <button
                key={zone.id}
                type="button"
                className={className}
                aria-label={`${zone.label} — ${zone.detail}`}
                title="בקרוב"
                {...handlers}
              >
                {label}
              </button>
            );
          }

          if (!zone.open) {
            return (
              <div
                key={zone.id}
                className={className}
                aria-disabled="true"
                title="אין הרשאה למערכת זו"
                {...handlers}
              >
                {label}
              </div>
            );
          }

          return (
            <Link
              key={zone.id}
              href={zone.href!}
              className={className}
              aria-label={`${zone.label} — ${zone.detail}`}
              onClick={() => {
                writeLastModuleId(zone.id);
                onNavigate?.();
              }}
              {...handlers}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
