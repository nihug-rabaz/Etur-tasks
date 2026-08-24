"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { CheckCircle2, Copy, Hourglass, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { CreateCandidateDrawer } from "@/modules/agam/components/create-drawers";
import { STATUS_LABELS, STATUS_TONES } from "@/modules/agam/lib/stages";
import { primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCandidate, AgamOrgSettings } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";

export function AgamDashboardPage() {
  const [candidates, setCandidates] = useState<AgamCandidate[]>([]);
  const [settings, setSettings] = useState<AgamOrgSettings | null>(null);
  const [role, setRole] = useState<ModuleRole | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void Promise.all([
      agamFetch<{ candidates: AgamCandidate[]; role: ModuleRole }>("/api/agam/candidates"),
      agamFetch<{ settings: AgamOrgSettings | null }>("/api/agam/settings"),
    ])
      .then(([candidatesData, settingsData]) => {
        setCandidates(candidatesData.candidates);
        setRole(candidatesData.role);
        setSettings(settingsData.settings);
      })
      .catch(() => toast.error("טעינת המועמדים נכשלה"))
      .finally(() => setLoaded(true));
  }, []);

  const isRamad = role === "admin" || role === "ramad";
  const stats = {
    total: candidates.length,
    pending: candidates.filter((row) => row.status === "pending").length,
    passed: candidates.filter((row) => row.status === "passed").length,
    notPassed: candidates.filter((row) => row.status === "not_passed").length,
  };
  const recent = candidates.slice(0, 8);

  const copyApply = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/agam/apply`);
    toast.success("קישור השאלון הועתק");
  };

  const copyUpload = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/agam/upload`);
    toast.success("קישור העלאת המסמכים הועתק");
  };

  if (!loaded) {
    return <p className="p-6 text-sm text-text-muted">טוען…</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <article className="dashboard-glass flex flex-col gap-6 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-sm font-bold text-accent-primary">הרבנות הצבאית</p>
          <h1 className="mt-2 text-3xl font-extrabold text-text-primary sm:text-4xl">
            {settings?.unit_name ?? "איתור קציני דת"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-text-secondary">
            ניהול תהליך המיון לקורס קציני דת — משאלון מקדים ועד החלטה סופית.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/agam/candidates" className={primaryButtonClass}>
              לרשימת מועמדים
            </Link>
            {role === "admin" || role === "ramad" || role === "user" ? <CreateCandidateDrawer /> : null}
            <button type="button" onClick={() => void copyApply()} className={secondaryButtonClass}>
              <Copy size={16} />
              העתקת קישור שאלון
            </button>
            <button type="button" onClick={() => void copyUpload()} className={secondaryButtonClass}>
              <Copy size={16} />
              קישור העלאת מסמכים
            </button>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={settings?.logo_url || "/logo-mador-omtz.png"}
          alt={settings?.unit_name ?? "איתור קציני דת"}
          className="h-24 w-auto object-contain sm:h-28"
        />
      </article>

      {isRamad ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="סה״כ מועמדים" value={stats.total} />
          <StatCard icon={Hourglass} label="ממתינים" value={stats.pending} />
          <StatCard icon={CheckCircle2} label="עברו" value={stats.passed} />
          <StatCard icon={XCircle} label="לא עברו" value={stats.notPassed} />
        </section>
      ) : null}

      <article className="dashboard-glass rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-text-primary">מועמדים אחרונים</h2>
          <Link href="/agam/candidates" className="text-xs font-bold text-accent-primary">
            הכל
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-text-muted">אין מועמדים עדיין.</p>
        ) : (
          <ul className="divide-y divide-black/8 dark:divide-white/10">
            {recent.map((candidate) => (
              <li key={candidate.id}>
                <Link
                  href={`/agam/candidates/${candidate.id}`}
                  className="flex items-center justify-between gap-3 py-3 transition hover:opacity-80"
                >
                  <div>
                    <p className="font-bold text-text-primary">{candidate.full_name}</p>
                    <p className="text-xs text-text-muted" dir="ltr">
                      {candidate.personal_number}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[candidate.status]}`}>
                    {STATUS_LABELS[candidate.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="dashboard-glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        <Icon size={16} className="text-accent-primary" />
      </div>
      <p className="mt-3 text-3xl font-extrabold text-text-primary">{value}</p>
    </div>
  );
}
