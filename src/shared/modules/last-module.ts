const STORAGE_KEY = "etur-last-module";

export function readLastModuleId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export function writeLastModuleId(moduleId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, moduleId);
  } catch {
    /* ignore quota / private mode */
  }
}
