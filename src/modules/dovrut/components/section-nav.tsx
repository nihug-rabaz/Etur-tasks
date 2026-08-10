"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dovrut/campaigns", label: "קמפיינים" },
  { href: "/dovrut/projects", label: "פרויקטים" },
  { href: "/dovrut/items", label: "פריטים" },
  { href: "/dovrut/tasks", label: "משימות" },
  { href: "/dovrut/approvals", label: "אישורים" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DovrutSectionNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-20 border-b border-black/8 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:border-white/10 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-2">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                active
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-text-primary hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
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
