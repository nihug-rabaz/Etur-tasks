import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  tone?: "default" | "danger";
}

export function StatCard({ title, value, icon, tone = "default" }: StatCardProps) {
  const toneClass =
    tone === "danger"
      ? "bg-danger/10 text-danger"
      : "bg-surface-1 text-text-primary";

  return (
    <article className={`rounded-2xl p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 ${toneClass}`}>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-text-secondary">
        <span>{title}</span>
        <span>{icon}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </article>
  );
}
