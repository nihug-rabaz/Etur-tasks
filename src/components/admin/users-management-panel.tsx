"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, Filter, RefreshCw, Search, UsersRound } from "lucide-react";
import type { Profile } from "@/types/models";
import { UserPermissionsEditor } from "@/components/admin/user-permissions-editor";
import { ProfileSettingsPanel } from "@/components/profile/profile-settings-panel";
import { isRenderableAvatarUrl } from "@/lib/images/avatar";
import { AVATAR_PALETTE, initialsFrom, pickAvatarBg } from "@/lib/ui/avatar";

type PermissionGroup = {
  domainSlug: string;
  domainLabel: string;
  items: Array<{ id: string; name: string }>;
};

type StatusFilter = "all" | "approved" | "pending";

interface UsersManagementPanelProps {
  users: Profile[];
  permissionGroups: PermissionGroup[];
  permissionsByUser: Record<string, string[]>;
  updateRoleAction: (formData: FormData) => Promise<void>;
  syncPermissionsAction: (formData: FormData) => Promise<void>;
  approveUserAction: (formData: FormData) => Promise<void>;
  setPendingAction: (formData: FormData) => Promise<void>;
}

export function UsersManagementPanel({
  users,
  permissionGroups,
  permissionsByUser,
  updateRoleAction,
  syncPermissionsAction,
  approveUserAction,
  setPendingAction,
}: UsersManagementPanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profileOverrides, setProfileOverrides] = useState<Record<string, { name: string; avatar: string | null }>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      if (statusFilter === "approved" && !user.is_approved) return false;
      if (statusFilter === "pending" && user.is_approved) return false;
      if (!q) return true;
      const blob = `${user.name} ${user.email ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [users, query, statusFilter]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#e6e9ef] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-slate-700 dark:bg-[#1e1e1e]">
      <div className="border-b border-[#e6e9ef] px-6 py-5 dark:border-slate-700">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[#323338] dark:text-slate-100">
              ניהול משתמשים
            </h1>
            <p className="mt-1 text-sm text-[#676879] dark:text-slate-400">
              הרשאות, אישורים ותחומי גישה — במבט אחד.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              title="בקרוב"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-[#323338] transition hover:bg-[#f6f7fb] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <BookOpen size={16} className="text-[#676879]" />
              מסמכים
            </button>
            <button
              type="button"
              title="בקרוב"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#c5c7d0] bg-white px-3 py-2 text-sm font-medium text-[#323338] shadow-sm transition hover:bg-[#f6f7fb] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/80"
            >
              <UsersRound size={16} className="text-[#676879]" />
              ניהול צוותים
            </button>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0073ea] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0060c3] active:scale-[0.99]"
            >
              <RefreshCw size={16} />
              רענון
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-[#e6e9ef] bg-[#fafbfc] px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-xl">
            <Search
              size={18}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#676879]"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי שם / אימייל…"
              className="w-full rounded-md border border-[#c5c7d0] bg-white py-2.5 pe-10 ps-3 text-sm text-[#323338] outline-none transition placeholder:text-[#676879] focus:border-[#0073ea] focus:ring-2 focus:ring-[#0073ea]/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#c5c7d0] bg-white px-3 py-2 text-sm font-medium text-[#323338] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
              <Filter size={16} className="text-[#676879]" />
              סינון
            </span>
            {(
              [
                { key: "all" as const, label: "הכל" },
                { key: "approved" as const, label: "מאושרים" },
                { key: "pending" as const, label: "ממתינים" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                  statusFilter === key
                    ? "bg-[#0073ea] text-white shadow-sm"
                    : "bg-white text-[#676879] ring-1 ring-[#e6e9ef] hover:bg-[#f6f7fb] dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-[#676879] dark:text-slate-500">
          מציג: {filtered.length} {filtered.length === 1 ? "משתמש" : "משתמשים"}
          {query.trim() || statusFilter !== "all" ? ` מתוך ${users.length}` : ""}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#e6e9ef] bg-[#f6f7fb] text-start dark:border-slate-700 dark:bg-slate-800/90">
              <th className="w-10 px-3 py-3" />
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#676879] dark:text-slate-400">
                שם
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#676879] dark:text-slate-400">
                אימייל
              </th>
              <th className="w-40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#676879] dark:text-slate-400">
                תפקיד
              </th>
              <th className="w-36 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#676879] dark:text-slate-400">
                סטטוס
              </th>
              <th className="w-44 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#676879] dark:text-slate-400">
                תחומי גישה
              </th>
              <th className="w-28 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#676879] dark:text-slate-400">
                פעולות
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const permCount = permissionsByUser[user.id]?.length ?? 0;
              const expanded = expandedId === user.id;
              const profileOverride = profileOverrides[user.id];
              const displayName = profileOverride?.name ?? user.name;
              const displayAvatar = profileOverride?.avatar ?? user.avatar;
              const avatarUrl = isRenderableAvatarUrl(displayAvatar) ? displayAvatar : null;

              return (
                <Fragment key={user.id}>
                  <tr className="group border-b border-[#e6e9ef] transition hover:bg-[#fafbfc] dark:border-slate-700/80 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => setExpandedId((id) => (id === user.id ? null : user.id))}
                        className="rounded p-1 text-[#676879] transition hover:bg-[#e6e9ef] hover:text-[#323338] dark:hover:bg-slate-700 dark:hover:text-slate-100"
                        aria-expanded={expanded}
                        title="הרשאות מפורטות"
                      >
                        <ChevronDown
                          size={18}
                          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
                          />
                        ) : (
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: pickAvatarBg(displayName || "?") }}
                          >
                            {initialsFrom(displayName || "?")}
                          </span>
                        )}
                        <span className="font-semibold text-[#323338] dark:text-slate-100">{displayName}</span>
                      </div>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 align-middle">
                      <span className="truncate text-[#323338] dark:text-slate-300" title={user.email ?? undefined}>
                        {user.email ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <form action={updateRoleAction} className="min-w-0">
                        <input type="hidden" name="userId" value={user.id} />
                        <div className="relative">
                          <select
                            name="role"
                            defaultValue={user.role}
                            onChange={(e) => e.currentTarget.form?.requestSubmit()}
                            className="w-full cursor-pointer appearance-none rounded-md border border-[#c5c7d0] bg-white py-2 ps-3 pe-8 text-sm font-medium text-[#323338] outline-none transition hover:border-[#0073ea]/50 focus:border-[#0073ea] focus:ring-2 focus:ring-[#0073ea]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <option value="user">משתמש</option>
                            <option value="admin">מנהל</option>
                          </select>
                          <ChevronDown
                            size={14}
                            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#676879]"
                          />
                        </div>
                      </form>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.is_approved
                            ? "bg-[#e5f7ed] text-[#00c875] dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-[#fff4e5] text-[#ff6900] dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        {user.is_approved ? "מאושר" : "ממתין"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => setExpandedId((id) => (id === user.id ? null : user.id))}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e9ef] bg-white px-2.5 py-1 text-xs font-semibold text-[#323338] shadow-sm transition hover:border-[#0073ea]/40 hover:text-[#0073ea] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <span className="flex items-center gap-0.5">
                          {permissionGroups.slice(0, 3).map((g, i) => (
                            <span
                              key={g.domainSlug}
                              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white dark:border-slate-900"
                              style={{ backgroundColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length] }}
                              title={g.domainLabel}
                            >
                              {g.domainLabel.slice(0, 1)}
                            </span>
                          ))}
                        </span>
                        {permCount > 0 ? (
                          <span className="text-[#676879]">+{permCount}</span>
                        ) : (
                          <span className="text-[#676879]">הגדרה</span>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <form action={user.is_approved ? setPendingAction : approveUserAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          className={
                            user.is_approved
                              ? "rounded-md border border-[#c5c7d0] bg-white px-3 py-1.5 text-xs font-semibold text-[#323338] transition hover:bg-[#f6f7fb] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              : "rounded-md bg-[#0073ea] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0060c3]"
                          }
                        >
                          {user.is_approved ? "להמתין" : "לאשר"}
                        </button>
                      </form>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="bg-[#fafbfc] dark:bg-slate-900/30">
                      <td colSpan={7} className="border-b border-[#e6e9ef] px-4 py-4 dark:border-slate-700">
                        <div className="grid gap-4 xl:grid-cols-2">
                          <div>
                            <p className="mb-3 text-sm font-semibold text-[#323338] dark:text-slate-100">עריכת פרופיל</p>
                            <ProfileSettingsPanel
                              variant="compact"
                              initialProfile={{
                                id: user.id,
                                name: displayName,
                                email: user.email ?? null,
                                avatar: displayAvatar,
                                role: user.role,
                              }}
                              onUpdated={(profile) => {
                                setProfileOverrides((current) => ({
                                  ...current,
                                  [user.id]: { name: profile.name, avatar: profile.avatar },
                                }));
                              }}
                            />
                          </div>
                          <div>
                            <p className="mb-3 text-sm font-semibold text-[#323338] dark:text-slate-100">הרשאות תתי-נושא</p>
                            <UserPermissionsEditor
                              userId={user.id}
                              isApproved={user.is_approved}
                              groups={permissionGroups}
                              selectedIds={permissionsByUser[user.id] ?? []}
                              syncAction={syncPermissionsAction}
                              variant="monday"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm font-medium text-[#676879] dark:text-slate-500">
          לא נמצאו משתמשים לפי הסינון.
        </div>
      ) : null}

    </div>
  );
}
