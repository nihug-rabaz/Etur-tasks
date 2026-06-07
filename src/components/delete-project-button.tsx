"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteProjectButtonProps {
  projectId: string;
  redirectTo?: string;
  iconOnly?: boolean;
  onDeleted?: () => void;
}

export function DeleteProjectButton({ projectId, redirectTo, iconOnly = false, onDeleted }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Deletes the project and its tasks, then refreshes or navigates away.
  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error === "Forbidden" ? "אין הרשאה למחוק פרויקט זה." : "מחיקת הפרויקט נכשלה.");
        return;
      }
      onDeleted?.();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs font-semibold text-rose-600">{error || "למחוק את הפרויקט וכל המשימות בו?"}</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
        >
          {deleting ? "מוחק…" : "מחיקה"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:text-text-primary"
        >
          ביטול
        </button>
      </span>
    );
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="מחיקת פרויקט"
        title="מחיקת פרויקט"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition hover:bg-rose-100"
      >
        <Trash2 size={14} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
    >
      <Trash2 size={15} />
      מחיקת פרויקט
    </button>
  );
}
