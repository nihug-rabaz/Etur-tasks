"use client";

import { Eye, LogOut, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { isRenderableAvatarUrl } from "@/lib/images/avatar";
import { initialsFrom, pickAvatarBg } from "@/lib/ui/avatar";

export interface ImpersonationViewState {
  active: boolean;
  actor: { id: string; name: string; role: string } | null;
  target: { id: string; name: string; role: string; avatar: string | null } | null;
}

interface ImpersonationBannerProps {
  state: ImpersonationViewState;
  onStopped?: () => void;
}

export function ImpersonationBanner({ state, onStopped }: ImpersonationBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!state.active || !state.target) {
    return null;
  }

  const avatarUrl = isRenderableAvatarUrl(state.target.avatar) ? state.target.avatar : null;

  const stopImpersonation = () => {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/impersonate", { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "לא הצלחנו לצאת מהתחזות");
        return;
      }
      onStopped?.();
      router.refresh();
      router.push("/admin/users");
    });
  };

  return (
    <div className="impersonation-banner" role="status" aria-live="polite">
      <div className="impersonation-banner__glow" aria-hidden />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="impersonation-banner__icon">
            <Eye size={16} strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-amber-950 dark:text-amber-50">
              <span>מצב התחזות פעיל</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-400/15 dark:text-amber-100">
                <Sparkles size={11} />
                תצוגת משתמש
              </span>
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-amber-900/80 dark:text-amber-100/85">
              אתה רואה את המערכת כמו{" "}
              <span className="font-bold text-amber-950 dark:text-white">{state.target.name}</span>
              {state.actor ? ` · מנהל: ${state.actor.name}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-amber-300/80" />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-amber-300/80"
              style={{ backgroundColor: pickAvatarBg(state.target.name) }}
            >
              {initialsFrom(state.target.name)}
            </span>
          )}
          <button
            type="button"
            onClick={stopImpersonation}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-950 px-3.5 py-2 text-xs font-bold text-amber-50 shadow-[0_8px_24px_-10px_rgba(120,53,15,0.75)] transition hover:bg-amber-900 disabled:opacity-60 dark:bg-amber-100 dark:text-amber-950 dark:hover:bg-white"
          >
            <LogOut size={14} />
            {isPending ? "יוצא…" : "יציאה מהתחזות"}
          </button>
        </div>
      </div>
      {error ? <p className="px-3 pb-2 text-xs font-semibold text-rose-700 sm:px-6">{error}</p> : null}
    </div>
  );
}

interface ImpersonateUserButtonProps {
  userId: string;
  userName: string;
  disabled?: boolean;
  className?: string;
}

export function ImpersonateUserButton({
  userId,
  userName,
  disabled = false,
  className = "",
}: ImpersonateUserButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const startImpersonation = () => {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "לא הצלחנו להתחזות");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={startImpersonation}
        disabled={disabled || isPending}
        title={`צפייה כ${userName}`}
        className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/20"
      >
        <Eye size={14} />
        {isPending ? "נכנס…" : "צפייה כמשתמש"}
      </button>
      {error ? <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
