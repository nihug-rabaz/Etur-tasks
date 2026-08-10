const FALLBACK = "/";

export function sanitizeCallbackUrl(raw: string | null | undefined, fallback = FALLBACK): string {
  if (!raw) return fallback;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    /* keep raw */
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      value = `${url.pathname}${url.search}`;
    } catch {
      return fallback;
    }
  }
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/api/auth") || value.startsWith("/pending-approval")) {
    return fallback;
  }
  return value || fallback;
}

export function moduleIdFromPath(pathname: string): "tasks" | "dovrut" | null {
  if (pathname === "/" || pathname === "") return null;
  if (pathname === "/dovrut" || pathname.startsWith("/dovrut/")) return "dovrut";
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/tasks/") ||
    pathname.startsWith("/projects/") ||
    pathname.startsWith("/domains/") ||
    pathname.startsWith("/subtopics/") ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/settings/")
  ) {
    return "tasks";
  }
  return null;
}
