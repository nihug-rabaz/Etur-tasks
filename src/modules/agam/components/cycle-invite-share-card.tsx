"use client";

import { Check, Copy, ExternalLink, Link2, RefreshCw, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cycleInviteAbsoluteUrl, cycleInvitePath } from "@/modules/agam/lib/cycle-invite";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import {
  panelClass,
  panelPadClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/agam/lib/ui";
import type { AgamCycle } from "@/modules/agam/types";

export function CycleInviteShareCard({
  cycle,
  canRotate = false,
  onRotated,
}: {
  cycle: AgamCycle;
  canRotate?: boolean;
  onRotated?: (cycle: AgamCycle) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const inviteUrl = useMemo(
    () => cycleInviteAbsoluteUrl(cycle.invite_slug),
    [cycle.invite_slug],
  );
  const dateLabel = formatAgamDate(cycle.cycle_date);

  const shareText = useMemo(() => {
    const lines = [
      `שלום,`,
      `להרשמה ליום המיונים של מחזור «${cycle.name}» מלאו את השאלון המקדים בקישור:`,
      inviteUrl,
    ];
    if (dateLabel) lines.splice(1, 0, `תאריך משוער: ${dateLabel}`);
    return lines.join("\n");
  }, [cycle.name, dateLabel, inviteUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("הקישור הועתק");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("העתקה נכשלה");
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("הודעה להעתקה לוואטסאפ הועתקה");
    } catch {
      toast.error("העתקה נכשלה");
    }
  };

  const rotate = async () => {
    if (
      !window.confirm(
        "ליצור קישור חדש? הקישור הישן יפסיק לעבוד עבור מועמדים שטרם נרשמו.",
      )
    ) {
      return;
    }
    setRotating(true);
    try {
      const data = await agamFetch<{ cycle: AgamCycle }>(`/api/agam/cycles/${cycle.id}`, {
        method: "PUT",
        body: JSON.stringify({ rotateInviteSlug: true }),
      });
      onRotated?.(data.cycle);
      toast.success("נוצר קישור חדש");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "חידוש הקישור נכשל");
    } finally {
      setRotating(false);
    }
  };

  return (
    <section className={`${panelClass} ${panelPadClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary/12 text-accent-primary">
              <Link2 size={18} />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-text-primary">קישור הרשמה למועמדים</h2>
              <p className="text-xs text-text-secondary">
                שלחו למועמדים — הם ממלאים שאלון מקדים ומצטרפים אוטומטית למחזור
              </p>
            </div>
          </div>
        </div>
        <a
          href={cycleInvitePath(cycle.invite_slug)}
          target="_blank"
          rel="noreferrer"
          className={secondaryButtonClass}
        >
          <ExternalLink size={15} />
          תצוגה מקדימה
        </a>
      </div>

      <div className="mt-4 rounded-2xl bg-surface-2/80 p-3 sm:p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
          קישור ייחודי למחזור
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code
            className="min-w-0 flex-1 truncate rounded-xl bg-surface-1 px-3 py-2.5 text-xs font-semibold text-text-primary sm:text-sm"
            dir="ltr"
          >
            {inviteUrl}
          </code>
          <button type="button" className={primaryButtonClass} onClick={() => void copyLink()}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "הועתק" : "העתקת קישור"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={secondaryButtonClass} onClick={() => void copyMessage()}>
          <Share2 size={15} />
          העתקת הודעה לשליחה
        </button>
        {canRotate ? (
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={rotating}
            onClick={() => void rotate()}
          >
            <RefreshCw size={15} className={rotating ? "animate-spin" : undefined} />
            {rotating ? "מחדש…" : "חידוש קישור"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
