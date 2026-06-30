"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UserAvatarMark } from "@/components/ui/assignee-select";
import { compressAvatarFile } from "@/lib/images/avatar";
import type { ProfilePayload } from "@/lib/profile/serialize";

interface ProfileSettingsPanelProps {
  initialProfile: ProfilePayload;
  variant?: "default" | "compact";
  onUpdated?: (profile: ProfilePayload) => void;
}

export function ProfileSettingsPanel({
  initialProfile,
  variant = "default",
  onUpdated,
}: ProfileSettingsPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialProfile.name);
  const [avatar, setAvatar] = useState<string | null>(initialProfile.avatar);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const apiBase = `/api/profile/${initialProfile.id}`;
  const compact = variant === "compact";

  useEffect(() => {
    setName(initialProfile.name);
    setAvatar(initialProfile.avatar);
  }, [initialProfile]);

  const applyProfile = (data: ProfilePayload) => {
    setName(data.name);
    setAvatar(data.avatar);
    onUpdated?.(data);
    router.refresh();
  };

  const saveProfile = async (payload: { name?: string; avatar?: string | null }) => {
    setSaving(true);
    const response = await fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("לא הצלחנו לשמור את הפרופיל");
      return null;
    }
    const data = (await response.json()) as ProfilePayload;
    applyProfile(data);
    return data;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("יש להזין שם תצוגה");
      return;
    }
    const result = await saveProfile({ name: trimmed });
    if (result) toast.success("הפרופיל עודכן");
  };

  const handlePickAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const dataUrl = await compressAvatarFile(file);
      const blob = await fetch(dataUrl).then((res) => res.blob());
      const formData = new FormData();
      formData.append("file", new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" }));
      const response = await fetch(`${apiBase}/avatar`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        toast.error("העלאת התמונה נכשלה");
        return;
      }
      const data = (await response.json()) as ProfilePayload;
      applyProfile(data);
      toast.success("תמונת הפרופיל עודכנה");
    } catch {
      toast.error("לא ניתן לעבד את התמונה");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const result = await saveProfile({ avatar: null });
    if (result) toast.success("תמונת הפרופיל הוסרה");
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-4" : "space-y-6"}>
      <div
        className={
          compact
            ? "rounded-xl border border-[#e6e9ef] bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40"
            : "rounded-3xl border border-border-weak bg-surface-1/80 p-6 shadow-[0_18px_45px_rgba(2,6,23,0.12)]"
        }
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <UserAvatarMark name={name || "?"} avatarUrl={avatar} size={compact ? "sm" : "md"} />
            <button
              type="button"
              onClick={handlePickAvatar}
              disabled={uploading || saving}
              className={
                compact
                  ? "absolute -bottom-1 -left-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#c5c7d0] bg-white text-[#323338] shadow transition hover:bg-[#f6f7fb] disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  : "absolute -bottom-1 -left-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-weak bg-surface-1 text-text-primary shadow transition hover:bg-surface-2 disabled:opacity-60"
              }
              aria-label="העלאת תמונת פרופיל"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <p className={compact ? "text-base font-bold text-[#323338] dark:text-slate-100" : "text-lg font-bold text-text-primary"}>
              {name || "משתמש"}
            </p>
            {initialProfile.email ? (
              <p className={compact ? "mt-1 text-sm text-[#676879] dark:text-slate-400" : "mt-1 text-sm text-text-secondary"}>
                {initialProfile.email}
              </p>
            ) : null}
            <p className={compact ? "mt-2 text-xs text-[#676879] dark:text-slate-500" : "mt-2 text-xs text-text-muted"}>
              {compact ? "עריכת שם ותמונה שיוצגו לשאר המשתמשים." : "התמונה תוצג למשתמשים אחרים במשימות ובחירת שיוך."}
            </p>
            {avatar ? (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploading || saving}
                className={
                  compact
                    ? "mt-3 inline-flex items-center gap-1 rounded-md border border-[#c5c7d0] bg-white px-3 py-1.5 text-xs font-semibold text-[#676879] transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    : "mt-3 inline-flex items-center gap-1 rounded-lg border border-border-weak bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-danger/40 hover:text-danger disabled:opacity-60"
                }
              >
                <Trash2 size={12} />
                הסרת תמונה
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={
          compact
            ? "rounded-xl border border-[#e6e9ef] bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40"
            : "rounded-3xl border border-border-weak bg-surface-1/80 p-6"
        }
      >
        <label
          className={
            compact
              ? "mb-2 block text-sm font-semibold text-[#323338] dark:text-slate-100"
              : "mb-2 block text-sm font-semibold text-text-primary"
          }
        >
          שם תצוגה
        </label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="איך יופיע השם במערכת"
          className={
            compact
              ? "w-full rounded-md border border-[#c5c7d0] bg-white px-3 py-2 text-sm text-[#323338] outline-none transition focus:border-[#0073ea] focus:ring-2 focus:ring-[#0073ea]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              : "w-full rounded-2xl border border-border-weak bg-surface-2/70 px-4 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/30"
          }
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || uploading}
          className={
            compact
              ? "inline-flex items-center gap-2 rounded-md bg-[#0073ea] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              : "inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-accent-primary to-accent-cyan px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60"
          }
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          שמירת פרופיל
        </button>
      </div>
    </form>
  );
}
