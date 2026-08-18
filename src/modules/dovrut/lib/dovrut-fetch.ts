export const DOVRUT_MUTATED_EVENT = "dovrut:mutated";

export async function dovrutFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = (await response.json().catch(() => null)) as T & { error?: string };
  if (!response.ok) {
    throw new Error((data && typeof data === "object" && data.error) || "הבקשה נכשלה");
  }
  return data;
}

export function emitDovrutMutated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DOVRUT_MUTATED_EVENT));
}
