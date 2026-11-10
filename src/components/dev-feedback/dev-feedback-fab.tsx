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

export function DevFeedbackFab() {
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

  return (
    <>
      {showKobiQueue ? (
        <div className="fixed bottom-[5.5rem] start-4 z-[70] sm:bottom-24">
          <KobiApprovalQueue
            enabled
            canApprove={isKobi}
            refreshToken={refreshToken}
          />
        </div>
      ) : null}

      {canSubmit ? (
        <button
          type="button"
          className="fixed bottom-4 start-4 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          onClick={() => setPanelOpen(true)}
          title="דיווח משימה לפיתוח"
          aria-label="דיווח משימה לפיתוח"
        >
          <Wrench className="h-6 w-6" />
        </button>
      ) : null}

      <DevFeedbackPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSubmitted={() => setRefreshToken((n) => n + 1)}
      />
    </>
  );
}
