"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { DevFeedbackPanel } from "@/components/dev-feedback/dev-feedback-panel";
import { KobiApprovalQueue } from "@/components/dev-feedback/kobi-approval-queue";

type AccessPayload = {
  canSubmit: boolean;
  isKobi: boolean;
  isPlatformAdmin?: boolean;
};

type Props = {
  /** Render compact controls for the app header (default). */
  variant?: "header" | "floating";
};

export function DevFeedbackFab({ variant = "header" }: Props) {
  const pathname = usePathname() || "/";
  const [canSubmit, setCanSubmit] = useState(false);
  const [isKobi, setIsKobi] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshAccess = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/dev-feedback/access?pathname=${encodeURIComponent(pathname)}`,
      );
      if (!res.ok) {
        setCanSubmit(false);
        setIsKobi(false);
        return;
      }
      const data = (await res.json()) as AccessPayload;
      setCanSubmit(Boolean(data.canSubmit));
      setIsKobi(Boolean(data.isKobi));
      setIsPlatformAdmin(Boolean(data.isPlatformAdmin));
    } catch {
      setCanSubmit(false);
    }
  }, [pathname]);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  const showKobiQueue = isKobi || isPlatformAdmin;

  if (!canSubmit && !showKobiQueue) return null;

  const controls = (
    <div className="flex items-center gap-1.5">
      {showKobiQueue ? (
        <KobiApprovalQueue
          enabled
          canApprove={isKobi}
          refreshToken={refreshToken}
          compact
        />
      ) : null}
      {canSubmit ? (
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-600/30 bg-emerald-600/15 text-emerald-800 transition hover:bg-emerald-600/25 dark:text-emerald-100"
          onClick={() => setPanelOpen(true)}
          title="דיווח משימה לפיתוח"
          aria-label="דיווח משימה לפיתוח"
        >
          <Wrench className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      {variant === "header" ? (
        controls
      ) : (
        <div className="fixed bottom-24 end-4 z-[70] sm:bottom-28">{controls}</div>
      )}

      <DevFeedbackPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSubmitted={() => setRefreshToken((n) => n + 1)}
      />
    </>
  );
}
