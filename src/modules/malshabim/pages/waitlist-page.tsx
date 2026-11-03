"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import {
  emptyStateClass,
  fieldClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/malshabim/lib/ui";
import type { MalshabimWaitlistEntry } from "@/modules/malshabim/services/waitlist.service";
import type { ModuleRole } from "@/shared/modules/types";

function canEditRole(role: ModuleRole | null): boolean {
  return role === "admin" || role === "user";
}

type DuplicatePopup = {
  message: string;
  kind?: "waitlist" | "candidate";
  id?: string;
  fullName?: string;
  serialNumber?: number | null;
};

export function MalshabimWaitlistPage({
  initialEntries = [],
  initialRole = null,
  openForm = false,
}: {
  initialEntries?: MalshabimWaitlistEntry[];
  initialRole?: ModuleRole | null;
  openForm?: boolean;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [role, setRole] = useState<ModuleRole | null>(initialRole);
  const [loading, setLoading] = useState(!initialRole);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(openForm);
  const [duplicatePopup, setDuplicatePopup] = useState<DuplicatePopup | null>(null);

  const canEdit = canEditRole(role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await malshabimFetch<{
        entries: MalshabimWaitlistEntry[];
        role: ModuleRole;
      }>("/api/malshabim/waitlist");
      setEntries(res.entries);
      setRole(res.role);
    } catch {
      toast.error("טעינת הרשימה נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialRole) void load();
  }, [initialRole, load]);

  const createEntry = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast.error("יש למלא שם מלא ומספר טלפון");
      return;
    }
    setSaving(true);
    try {
      const res = await malshabimFetch<{ entry: MalshabimWaitlistEntry }>(
        "/api/malshabim/waitlist",
        {
          method: "POST",
          body: JSON.stringify({
            full_name: fullName.trim(),
            phone: phone.trim(),
          }),
        },
      );
      setEntries((prev) => [res.entry, ...prev]);
      setFullName("");
      setPhone("");
      setShowForm(false);
      toast.success("נשמר ברשימת מחכים לראיון");
    } catch (error) {
      const message = error instanceof Error ? error.message : "שמירה נכשלה";
      const apiError = error as Error & {
        status?: number;
        body?: {
          duplicate?: {
            kind?: "waitlist" | "candidate";
            id?: string;
            full_name?: string;
            serial_number?: number | null;
          };
        };
      };
      if (
        apiError.status === 409 ||
        message.includes("כפילות") ||
        message.includes("כבר קיים")
      ) {
        const dup = apiError.body?.duplicate;
        setDuplicatePopup({
          message,
          kind: dup?.kind,
          id: dup?.id,
          fullName: dup?.full_name,
          serialNumber: dup?.serial_number,
        });
        return;
      }
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (id: string) => {
    if (!canEdit) return;
    if (!window.confirm("להסיר את הפנייה מרשימת מחכים לראיון?")) return;
    setDeletingId(id);
    try {
      await malshabimFetch(`/api/malshabim/waitlist/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      toast.success("הוסר מהרשימה");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקה נכשלה");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className={pageShellClass} dir="rtl">
      <div className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-start gap-3">
            <Link
              href="/malshabim"
              className={secondaryButtonClass}
              aria-label="חזרה לתיקי מועמדים"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Link>
            <div>
              <h1 className={pageTitleClass}>מחכים לראיון</h1>
              <p className={pageSubtitleClass}>
                פניות חדשות שממתינות לתחילת ראיון · {entries.length} ברשימה
              </p>
            </div>
          </div>
          {canEdit ? (
            <button
              type="button"
              className={`${primaryButtonClass} !bg-violet-600 hover:!bg-violet-700`}
              onClick={() => setShowForm((open) => !open)}
            >
              <Plus className="h-4 w-4" />
              פנייה חדשה
            </button>
          ) : null}
        </div>

        {showForm && canEdit ? (
          <div className="mt-4 grid gap-3 rounded-2xl bg-surface-2/60 p-4 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className={fieldClass}
              placeholder="שם מלא *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              className={fieldClass}
              placeholder="מספר טלפון *"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={15}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={primaryButtonClass}
                disabled={saving}
                onClick={() => void createEntry()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                שמור
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => {
                  setShowForm(false);
                  setFullName("");
                  setPhone("");
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <div className={emptyStateClass}>
          <Users className="mx-auto mb-2 h-8 w-8 text-text-muted" />
          אין כרגע חיילים שמחכים לראיון
        </div>
      ) : (
        <div className={`${panelClass} overflow-hidden`}>
          <ul className="divide-y divide-border-weak">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="font-bold text-text-primary">{entry.full_name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-text-secondary">
                    <Phone className="h-3.5 w-3.5" />
                    {entry.phone}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    פנייה · מחכה לראיון
                  </span>
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/malshabim/interview?waitlistId=${entry.id}`}
                      className={primaryButtonClass}
                    >
                      התחלת ראיון
                    </Link>
                    <button
                      type="button"
                      className={`${secondaryButtonClass} !text-rose-600`}
                      disabled={deletingId === entry.id}
                      onClick={() => void removeEntry(entry.id)}
                      aria-label={`הסר את ${entry.full_name}`}
                    >
                      {deletingId === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {duplicatePopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${panelClass} max-w-md p-6`} dir="rtl" role="dialog" aria-modal="true">
            <h2 className="flex items-center gap-2 text-lg font-bold text-rose-600">
              <AlertTriangle className="h-5 w-5" /> נתון כפול במערכת
            </h2>
            <p className="mt-3 text-sm text-text-secondary">{duplicatePopup.message}</p>
            {duplicatePopup.kind === "candidate" && duplicatePopup.serialNumber != null ? (
              <p className="mt-2 text-sm font-medium text-text-primary">
                פתרון: פתחו את תיק #{duplicatePopup.serialNumber}
                {duplicatePopup.fullName ? ` (${duplicatePopup.fullName})` : ""} במקום פנייה חדשה.
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {duplicatePopup.kind === "candidate" && duplicatePopup.id ? (
                <Link
                  href={`/malshabim/candidates/${duplicatePopup.id}`}
                  className={primaryButtonClass}
                  onClick={() => setDuplicatePopup(null)}
                >
                  פתח תיק קיים
                </Link>
              ) : null}
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setDuplicatePopup(null)}
              >
                הבנתי, אתקן
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
