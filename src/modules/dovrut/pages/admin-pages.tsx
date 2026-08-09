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

const ROLE_LABELS: Record<ModuleRole, string> = {
  admin: "מנהל",
  user: "חפ״ש",
  approver: "מאשר",
};

function looksLatinHeavy(name: string): boolean {
  const letters = name.replace(/[^A-Za-z\u0590-\u05FF]/g, "");
  if (!letters) return false;
  const latin = (name.match(/[A-Za-z]/g) ?? []).length;
  return latin / letters.length > 0.5;
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
      <p className="text-sm text-text-muted">
        מנהל · חפ״ש · מאשר — רק מנהל מנהל משתמשים. שמות באנגלית מומלץ לעדכן בעברית בפרופיל.
      </p>
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
                {looksLatinHeavy(user.name) ? " · מומלץ שם בעברית" : ""}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as ModuleRole)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
          >
            <option value="admin">מנהל</option>
            <option value="user">חפ״ש</option>
            <option value="approver">מאשר</option>
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
              {looksLatinHeavy(user.name) ? (
                <p className="text-[11px] font-semibold text-amber-700">
                  שם באנגלית — עדכנו בעברית בהגדרות פרופיל
                </p>
              ) : null}
            </div>
            <span className="text-xs font-extrabold text-violet-700">
              {ROLE_LABELS[user.role]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DovrutApproversAdminPage() {
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<
    "waiting_branch_head" | "waiting_deputy_commander" | "waiting_chief_rabbi"
  >("waiting_chief_rabbi");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/dovrut/admin/users");
      const data = await response.json();
      const moduleUsers = Array.isArray(data.moduleUsers) ? data.moduleUsers : [];
      setUsers(
        moduleUsers
          .filter((user: { role: string }) => user.role === "approver" || user.role === "admin")
          .map((user: { user_id: string; name: string }) => ({
            id: user.user_id,
            name: user.name,
          })),
      );
    })();
  }, []);

  const sendReminders = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/api/dovrut/approvals/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: step, userIds: selected }),
      });
      const data = await response.json();
      if (!response.ok) {
        setResult(data.error || "שליחה נכשלה");
        return;
      }
      setResult(`נשלחו ${data.sent} תזכורות Telegram · ${data.pendingCount} פריטים ממתינים`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <h1 className="text-xl font-bold text-text-primary">ניהול מאשרים ותזכורות</h1>
      <p className="text-sm text-text-secondary">
        תזכורות נשלחות בטלגרם למשתמשים מקושרים. Signal יתווסף בשלב הבא.
      </p>
      <select
        value={step}
        onChange={(e) => setStep(e.target.value as typeof step)}
        className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
      >
        <option value="waiting_branch_head">תור רמ״ח</option>
        <option value="waiting_deputy_commander">תור רמ״ט</option>
        <option value="waiting_chief_rabbi">תור רבצ״ר</option>
      </select>
      <ul className="space-y-2">
        {users.map((user) => {
          const checked = selected.includes(user.id);
          return (
            <li key={user.id}>
              <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, user.id]
                        : prev.filter((id) => id !== user.id),
                    );
                  }}
                />
                {user.name}
              </label>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={busy || selected.length === 0}
        onClick={() => void sendReminders()}
        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
      >
        {busy ? "שולח…" : "שלח תזכורת Telegram"}
      </button>
      {result ? <p className="text-xs font-semibold text-violet-700">{result}</p> : null}
      <ul className="mt-4 space-y-2 text-sm">
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
    </div>
  );
}
