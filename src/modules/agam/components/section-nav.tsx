"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ModuleRole } from "@/shared/modules/types";

const ITEMS: Array<{ href: string; label: string; roles: ModuleRole[] }> = [
  { href: "/agam", label: "ראשי", roles: ["admin", "user", "ramad", "viewer"] },
  { href: "/agam/cycles", label: "מחזורים", roles: ["admin", "user", "ramad", "viewer"] },
  { href: "/agam/candidates", label: "מועמדים", roles: ["admin", "user", "ramad", "viewer"] },
  { href: "/agam/candidates/archive", label: "ארכיון", roles: ["admin", "ramad"] },
  { href: "/agam/admin", label: "ניהול", roles: ["admin"] },
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
    <div className="sticky top-0 z-20 border-b border-black/8 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:border-white/10 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                active
                  ? "bg-accent-primary text-white"
                  : "bg-surface-2 text-text-secondary hover:bg-accent-primary/12 hover:text-accent-primary"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
