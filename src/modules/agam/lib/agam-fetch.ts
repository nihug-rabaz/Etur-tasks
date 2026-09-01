async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text.slice(0, 200) || "הבקשה נכשלה" };
  }
}

export async function agamFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = (await parseResponseBody(response)) as T & { error?: string };
  if (!response.ok) {
    const fallback =
      response.status === 502
        ? "שגיאת שרת זמנית"
        : response.status === 503
          ? "השירות אינו זמין כרגע"
          : "הבקשה נכשלה";
    throw new Error((data && typeof data === "object" && data.error) || fallback);
  }
  return data;
}
