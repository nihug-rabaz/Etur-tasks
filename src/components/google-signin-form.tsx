"use client";

import { useEffect, useState } from "react";

export function GoogleSignInForm() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/csrf")
      .then((res) => {
        if (!res.ok) throw new Error("csrf");
        return res.json() as Promise<{ csrfToken?: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (typeof data.csrfToken === "string") {
          setCsrfToken(data.csrfToken);
        } else {
          setLoadError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <p className="text-center text-sm text-rose-700">
        לא ניתן להכין התחברות. רענן את הדף או נסה שוב.
      </p>
    );
  }

  if (!csrfToken) {
    return (
      <p className="text-center text-sm text-stone-500">טוען…</p>
    );
  }

  return (
    <form action="/api/auth/signin/google" method="POST" className="block">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value="/dashboard" />
      <button
        type="submit"
        className="flex w-full items-center justify-center rounded-xl border border-stone-200 bg-white py-2.5 font-medium text-stone-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/80 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        כניסה עם Google
      </button>
    </form>
  );
}
