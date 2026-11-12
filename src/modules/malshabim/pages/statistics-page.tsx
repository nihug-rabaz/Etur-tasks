"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  PieChart,
  Users,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import {
  CANDIDATE_STATUSES,
  normalizeCandidateStatus,
} from "@/modules/malshabim/lib/status";
import {
  pageShellClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/malshabim/lib/ui";
import type { MalshabimCandidate } from "@/modules/malshabim/types";

const TRACK_COLORS = [
  "#1e3a5f",
  "#d4a017",
  "#7c3aed",
  "#16a34a",
  "#ea580c",
  "#64748b",
  "#2563eb",
  "#db2777",
];

type ChartKind = "donut" | "bars";

function DonutChart({
  items,
}: {
  items: Array<{ label: string; count: number; color: string }>;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const geometryTotal = total || 1;
  const radius = 54;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;
  const segments = items.reduce<
    Array<{ label: string; color: string; length: number; dashoffset: number }>
  >((acc, item) => {
    const length = (item.count / geometryTotal) * circumference;
    const dashoffset = -acc.reduce((sum, seg) => sum + seg.length, 0);
    acc.push({ label: item.label, color: item.color, length, dashoffset });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-6">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#e8edf3"
          strokeWidth={stroke}
        />
        {segments.map((item) => (
            <circle
              key={item.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={stroke}
              strokeDasharray={`${item.length} ${circumference - item.length}`}
              strokeDashoffset={item.dashoffset}
              transform="rotate(-90 70 70)"
            />
        ))}
        <text
          x="70"
          y="68"
          textAnchor="middle"
          className="fill-slate-800"
          style={{ fontSize: 18, fontWeight: 800 }}
        >
          {total}
        </text>
        <text
          x="70"
          y="86"
          textAnchor="middle"
          className="fill-slate-500"
          style={{ fontSize: 10, fontWeight: 600 }}
        >
          סה״כ
        </text>
      </svg>
      <ul className="grid w-full gap-1.5 text-xs font-bold sm:max-w-[11rem]">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
            <span className="tabular-nums text-slate-900">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerticalBars({
  items,
  barColor,
}: {
  items: Array<{ label: string; count: number }>;
  barColor: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="flex h-56 items-end justify-between gap-2 px-1 pt-4 sm:gap-3">
      {items.map((item) => {
        const height = Math.max(6, Math.round((item.count / max) * 100));
        return (
          <div
            key={item.label}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
          >
            <span className="text-xs font-black tabular-nums text-slate-800">
              {item.count}
            </span>
            <div
              className="w-full max-w-[3.25rem] rounded-t-xl"
              style={{ height: `${height}%`, backgroundColor: barColor }}
              title={`${item.label}: ${item.count}`}
            />
            <span className="line-clamp-2 min-h-[2.5rem] text-center text-[11px] font-bold leading-tight text-slate-600">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="flex min-h-[96px] items-center gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">
          {value}
        </p>
      </div>
    </div>
  );
}

export function MalshabimStatisticsPage({
  initialCandidates,
}: {
  initialCandidates: MalshabimCandidate[];
}) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [relativeChart, setRelativeChart] = useState<ChartKind>("donut");
  const [trackBarsChart, setTrackBarsChart] = useState<ChartKind>("bars");
  const [statusChart, setStatusChart] = useState<ChartKind>("bars");

  const active = useMemo(
    () => initialCandidates.filter((c) => !c.is_draft),
    [initialCandidates],
  );

  const byTrack = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of active) {
      const key = (c.recruitment_track || "").trim() || "ללא מסלול";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count], index) => ({
        label,
        count,
        color: TRACK_COLORS[index % TRACK_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [active]);

  const byStatus = useMemo(() => {
    return CANDIDATE_STATUSES.map((status) => ({
      label: status,
      count: active.filter(
        (c) => normalizeCandidateStatus(c.candidate_status) === status,
      ).length,
    }));
  }, [active]);

  const quizPassed = active.filter((c) => c.quiz_passed).length;
  const inTreatment = byStatus.find((row) => row.label === "בטיפול")?.count || 0;
  const completed = active.filter((c) => {
    const status = normalizeCandidateStatus(c.candidate_status);
    return status === "אושר ושובץ" || status === "אושר ולא שובץ";
  }).length;

  const exportPdf = async () => {
    if (!reportRef.current) {
      toast.error("אין תוכן לייצוא");
      return;
    }
    setExporting(true);
    try {
      const node = reportRef.current;
      const capture = (scale: number) =>
        html2canvas(node, {
          scale,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#f3f6fb",
          logging: false,
          foreignObjectRendering: false,
          imageTimeout: 15000,
          onclone: (doc, cloned) => {
            doc.documentElement.setAttribute("dir", "rtl");
            doc.body.setAttribute("dir", "rtl");
            doc.body.style.direction = "rtl";
            cloned.querySelectorAll("svg").forEach((svg) => {
              svg.setAttribute("width", String(svg.clientWidth || 160));
              svg.setAttribute("height", String(svg.clientHeight || 160));
            });
          },
        });

      let canvas: HTMLCanvasElement;
      try {
        canvas = await capture(1.5);
      } catch {
        canvas = await capture(1);
      }

      if (!canvas.width || !canvas.height) {
        throw new Error("צילום המסך לייצוא נכשל");
      }

      const img = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(img, "JPEG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(img, "JPEG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`statistics-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF יוצא בהצלחה");
    } catch (error) {
      console.error("[malshabim-export-pdf]", error);
      toast.error(error instanceof Error ? error.message : "ייצוא PDF נכשל");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={pageShellClass} dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#c9a227] sm:text-3xl">
            מרכז סטטיסטיקות
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            תמונת מצב לפי מסלולי גיוס והתקדמות מועמדים
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={exporting}
            onClick={() => void exportPdf()}
          >
            <Download className="h-4 w-4" />
            {exporting ? "מייצא…" : "ייצוא PDF"}
          </button>
          <Link href="/malshabim/board" className={secondaryButtonClass}>
            <ArrowRight className="h-4 w-4" /> חזרה לטבלה
          </Link>
          <Link href="/malshabim" className={secondaryButtonClass}>
            חזרה לבית
          </Link>
        </div>
      </div>

      <div
        ref={reportRef}
        className="space-y-4 rounded-[2rem] bg-[#f3f6fb] p-3 sm:space-y-5 sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="סך מועמדים"
            value={active.length}
            icon={<Users className="h-5 w-5" />}
            tone="bg-slate-900/10 text-slate-800"
          />
          <KpiCard
            label="עברו מבחן ידע"
            value={quizPassed}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="bg-emerald-500/15 text-emerald-700"
          />
          <KpiCard
            label="בטיפול פעיל"
            value={inTreatment}
            icon={<Clock3 className="h-5 w-5" />}
            tone="bg-sky-500/15 text-sky-700"
          />
          <KpiCard
            label="הושלמו"
            value={completed}
            icon={<Activity className="h-5 w-5" />}
            tone="bg-slate-900/10 text-slate-800"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black text-slate-900">חלוקה יחסית</h2>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700"
                onClick={() =>
                  setRelativeChart((prev) => (prev === "donut" ? "bars" : "donut"))
                }
              >
                <PieChart className="h-3.5 w-3.5" />
                {relativeChart === "donut" ? "גרף עמודות" : "תרשים עוגה"}
              </button>
            </div>
            {byTrack.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">אין נתונים</p>
            ) : relativeChart === "donut" ? (
              <DonutChart items={byTrack} />
            ) : (
              <VerticalBars items={byTrack} barColor="#c9a227" />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black text-slate-900">
                מרואיינים לפי מסלול
              </h2>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700"
                onClick={() =>
                  setTrackBarsChart((prev) => (prev === "bars" ? "donut" : "bars"))
                }
              >
                {trackBarsChart === "bars" ? "תרשים עוגה" : "גרף עמודות"}
              </button>
            </div>
            {byTrack.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">אין נתונים</p>
            ) : trackBarsChart === "bars" ? (
              <VerticalBars items={byTrack} barColor="#c9a227" />
            ) : (
              <DonutChart items={byTrack} />
            )}
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-black text-slate-900">
              חלוקה לפי סטטוס עבודה
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                מתעדכן בזמן אמת
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700"
                onClick={() =>
                  setStatusChart((prev) => (prev === "bars" ? "donut" : "bars"))
                }
              >
                {statusChart === "bars" ? "תרשים עוגה" : "גרף עמודות"}
              </button>
            </div>
          </div>
          {statusChart === "bars" ? (
            <VerticalBars items={byStatus} barColor="#1e3a5f" />
          ) : (
            <DonutChart
              items={byStatus.map((row, index) => ({
                ...row,
                color: TRACK_COLORS[index % TRACK_COLORS.length],
              }))}
            />
          )}
        </section>
      </div>
    </div>
  );
}
