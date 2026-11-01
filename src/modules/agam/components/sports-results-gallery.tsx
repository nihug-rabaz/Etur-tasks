"use client";

import { Check, ImageIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { documentDownloadHref } from "@/modules/agam/lib/document-download";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { isSportsResultsDocument } from "@/modules/agam/lib/document-types";
import type { AgamDocument } from "@/modules/agam/types";

export function sportsResultPhotos(documents: AgamDocument[]): AgamDocument[] {
  return documents.filter(isSportsResultsDocument);
}

export function pendingSportsResultPhotos(documents: AgamDocument[]): AgamDocument[] {
  return sportsResultPhotos(documents).filter((document) => !document.approved_at);
}

export function SportsResultsPhotos({
  documents,
  canApprove = false,
  onSaved,
}: {
  documents: AgamDocument[];
  canApprove?: boolean;
  onSaved?: () => void;
}) {
  const photos = sportsResultPhotos(documents);
  if (photos.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-surface-2/70 px-3 py-2.5 text-xs font-semibold text-text-muted">
        <ImageIcon size={14} />
        המועמד עדיין לא העלה תמונות
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((document) => (
        <SportsPhotoCard
          key={document.id}
          document={document}
          canApprove={canApprove}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}

function SportsPhotoCard({
  document,
  canApprove,
  onSaved,
}: {
  document: AgamDocument;
  canApprove: boolean;
  onSaved?: () => void;
}) {
  const [approving, setApproving] = useState(false);
  const href = documentDownloadHref(document.id);
  const approved = Boolean(document.approved_at);

  const setApproval = async (next: boolean) => {
    if (!canApprove || approving) return;
    setApproving(true);
    try {
      await agamFetch("/api/agam/documents", {
        method: "PATCH",
        body: JSON.stringify({ id: document.id, approved: next }),
      });
      toast.success(next ? "התמונה אושרה" : "האישור בוטל");
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העדכון נכשל");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl bg-surface-2/70">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group block transition hover:brightness-[0.98]"
        title={document.name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={document.name} className="aspect-[3/4] w-full object-cover" />
      </a>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <label
          className={`inline-flex min-w-0 flex-1 items-center gap-1.5 text-[10px] font-semibold ${
            canApprove ? "cursor-pointer text-text-secondary" : "text-text-muted"
          }`}
        >
          <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={approved}
              disabled={!canApprove || approving}
              onChange={(event) => void setApproval(event.target.checked)}
            />
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40 ${
                approved
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-black/20 bg-surface-1 dark:border-white/25"
              } ${canApprove ? "" : "opacity-80"}`}
              aria-hidden
            >
              {approving ? (
                <Loader2 size={10} className="animate-spin" />
              ) : approved ? (
                <Check size={10} strokeWidth={3} />
              ) : null}
            </span>
          </span>
          <span className="min-w-0 truncate">
            {approved
              ? document.approved_by_name
                ? `אושר · ${document.approved_by_name}`
                : "אושר"
              : "אישור"}
          </span>
        </label>
        <span className="shrink-0 text-[10px] font-semibold text-text-muted">{formatAgamDate(document.created_at)}</span>
      </div>
    </div>
  );
}
