"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function GoogleSignInForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(false);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-center text-sm text-rose-700">
          לא ניתן להתחבר. נסה שוב.
        </p>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center rounded-xl border border-stone-200 bg-white py-2.5 font-medium text-stone-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/80 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          נסה שוב עם Google
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="flex w-full items-center justify-center rounded-xl border border-stone-200 bg-white py-2.5 font-medium text-stone-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/80 disabled:cursor-wait disabled:opacity-70 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
    >
      {loading ? "מעביר ל-Google…" : "כניסה עם Google"}
    </button>
  );
}
