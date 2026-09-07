"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  LayoutDashboard,
  Layers,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ModuleRole } from "@/shared/modules/types";

const ITEMS: Array<{
  href: string;
  label: string;
  roles: ModuleRole[];
  icon: LucideIcon;
}> = [
  { href: "/agam", label: "ראשי", roles: ["admin", "user", "ramad", "viewer"], icon: LayoutDashboard },
  { href: "/agam/cycles", label: "מחזורים", roles: ["admin", "user", "ramad", "viewer"], icon: Layers },
  { href: "/agam/candidates", label: "מועמדים", roles: ["admin", "user", "ramad", "viewer"], icon: Users },
  { href: "/agam/candidates/archive", label: "ארכיון", roles: ["admin", "ramad"], icon: Archive },
  { href: "/agam/admin", label: "ניהול", roles: ["admin"], icon: Settings2 },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/agam") return pathname === "/agam";
  if (href === "/agam/candidates") {
    return (
      pathname === "/agam/candidates" ||
      (pathname.startsWith("/agam/candidates/") && !pathname.startsWith("/agam/candidates/archive"))
    );
  }
  if (href === "/agam/cycles") {
    return pathname === "/agam/cycles" || pathname.startsWith("/agam/cycles/");
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function AgamSectionNav({ role }: { role: ModuleRole | null }) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => (role ? item.roles.includes(role) : false));

  return (
    <>
      {/* Desktop: floating glass rail on the inline-end (right in RTL) */}
      <aside
        className="agam-float-nav pointer-events-none fixed start-2 top-1/2 z-30 hidden -translate-y-1/2 md:block lg:start-3"
        aria-label="ניווט קצינים"
      >
        <nav className="agam-float-nav__panel pointer-events-auto flex w-[4.75rem] flex-col gap-1 p-2">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`agam-float-nav__item ${active ? "agam-float-nav__item--active" : ""}`}
              >
                <Icon size={18} strokeWidth={2.1} className="text-inherit" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile: floating glass dock */}
      <nav
        className="agam-float-nav__mobile pointer-events-auto fixed inset-x-3 bottom-3 z-30 md:hidden"
        aria-label="ניווט קצינים"
      >
        <div className="agam-float-nav__panel flex items-stretch justify-between gap-0.5 p-1.5">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`agam-float-nav__item agam-float-nav__item--mobile ${active ? "agam-float-nav__item--active" : ""}`}
              >
                <Icon size={16} strokeWidth={2.1} className="text-inherit" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
