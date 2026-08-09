"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModuleRole } from "@/shared/modules/types";

interface ModuleUser {
  user_id: string;
  name: string;
  email: string | null;
  role: ModuleRole;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string | null;
}

export function DovrutAdminUsersPage() {
  const [moduleUsers, setModuleUsers] = useState<ModuleUser[]>([]);
  const [allUsers, setAllUsers] = useState<PlatformUser[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<ModuleRole>("user");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/dovrut/admin/users");
    const data = await response.json();
    setModuleUsers(Array.isArray(data.moduleUsers) ? data.moduleUsers : []);
    setAllUsers(Array.isArray(data.allUsers) ? data.allUsers : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!userId) return;
    setMessage("");
    const response = await fetch("/api/dovrut/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "עדכון נכשל");
      return;
    }
    setMessage("עודכן");
    await load();
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <h1 className="text-xl font-bold text-text-primary">משתמשי מודול דוברות</h1>
      <div className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#161922]">
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 sm:col-span-2"
          >
            <option value="">בחרו משתמש</option>
            {allUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} {user.email ? `(${user.email})` : ""}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as ModuleRole)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
          >
            <option value="admin">admin</option>
            <option value="user">user</option>
            <option value="approver">approver</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"
        >
          שמור תפקיד
        </button>
        {message ? <p className="mt-2 text-xs font-semibold text-violet-700">{message}</p> : null}
      </div>
      <ul className="space-y-2">
        {moduleUsers.map((user) => (
          <li
            key={user.user_id}
            className="flex items-center justify-between rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
          >
            <div>
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-[11px] text-text-muted">{user.email}</p>
            </div>
            <span className="text-xs font-extrabold text-violet-700">{user.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DovrutApproversAdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <h1 className="text-xl font-bold text-text-primary">ניהול מאשרים</h1>
      <p className="text-sm text-text-secondary">
        שליחת תזכורות WhatsApp מתבצעת דרך קישורי הסביבה:
      </p>
      <ul className="space-y-2 text-sm">
        <li className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
          /dovrut/approval/branch-head
        </li>
        <li className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
          /dovrut/approval/deputy-commander
        </li>
        <li className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
          /dovrut/approval/chief-rabbi
        </li>
      </ul>
      <p className="text-xs text-text-muted">
        פתחו wa.me עם מספר המאשר והדביקו את קישור הסביבה בהודעה.
      </p>
    </div>
  );
}
