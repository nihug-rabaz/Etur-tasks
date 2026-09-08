"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModuleRole } from "@/shared/modules/types";
import { fieldClass, pageShellClass, panelClass, primaryButtonClass } from "@/modules/nagadim/lib/ui";

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

const ROLE_LABELS: Record<"admin" | "user" | "viewer", string> = {
  admin: "מנהל",
  user: "משתמש",
  viewer: "צופה",
};

export function NagadimAdminUsersPage() {
  const [moduleUsers, setModuleUsers] = useState<ModuleUser[]>([]);
  const [allUsers, setAllUsers] = useState<PlatformUser[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"admin" | "user" | "viewer">("user");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/nagadim/admin/users");
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
    const response = await fetch("/api/nagadim/admin/users", {
      method: "POST",
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
    <div className={`${pageShellClass} max-w-4xl`}>
      <h1 className="text-xl font-bold text-text-primary">משתמשי מודול נגדים</h1>
      <p className="text-sm text-text-muted">מנהל · משתמש · צופה</p>

      <div className={`${panelClass} p-4`}>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className={`${fieldClass} sm:col-span-2`}
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
            onChange={(event) => setRole(event.target.value as typeof role)}
            className={fieldClass}
          >
            <option value="admin">מנהל</option>
            <option value="user">משתמש</option>
            <option value="viewer">צופה</option>
          </select>
        </div>
        <button type="button" onClick={() => void save()} className={`${primaryButtonClass} mt-3`}>
          שמור תפקיד
        </button>
        {message ? <p className="mt-2 text-xs font-semibold text-accent-primary">{message}</p> : null}
      </div>

      <ul className="space-y-2">
        {moduleUsers.map((user) => (
          <li
            key={user.user_id}
            className="flex items-center justify-between rounded-xl bg-surface-1 px-4 py-3 shadow-[var(--shadow-soft)]"
          >
            <div>
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-[11px] text-text-muted">{user.email}</p>
            </div>
            <span className="text-xs font-bold text-text-secondary">
              {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
