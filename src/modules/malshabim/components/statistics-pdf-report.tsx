"use client";

import { domToJpeg } from "modern-screenshot";
import { jsPDF } from "jspdf";
import type { MalshabimCandidateStatus } from "@/modules/malshabim/types";

/** A4 at 96dpi — the report is laid out at this fixed size regardless of the viewport. */
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const TABLE_ROWS_PER_PAGE = 22;

const INK = "#16181d";
const MUTED = "#6b7280";
const LINE = "#e6e9ef";
const NAVY = "#1e3a5f";
const GOLD = "#c9a227";

export const STATUS_HEX: Record<MalshabimCandidateStatus, string> = {
  בטיפול: "#f59e0b",
  "אושר ושובץ": "#7c3aed",
  "אושר ולא שובץ": "#059669",
  "לא אושר": "#e11d48",
};

export type StatisticsReportData = {
  generatedAt: Date;
  total: number;
  kpis: Array<{ label: string; value: number; color: string }>;
  tracks: Array<{ label: string; count: number; color: string }>;
  statuses: Array<{ label: MalshabimCandidateStatus; count: number }>;
  trackRows: Array<{
    label: string;
    total: number;
    quizPassed: number;
    byStatus: Record<MalshabimCandidateStatus, number>;
  }>;
};

function percent(count: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function PageFrame({
  data,
  pageNumber,
  pageCount,
  compactHeader = false,
  children,
}: {
  data: StatisticsReportData;
  pageNumber: number;
  pageCount: number;
  compactHeader?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      data-pdf-page
      dir="rtl"
      style={{
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        background: "#ffffff",
        color: INK,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-heebo), Arial, sans-serif",
        boxSizing: "border-box",
        padding: "44px 48px 28px",
      }}
    >
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: 0.2 }}>
            מלש״בים · הרבנות הצבאית
          </p>
          <h1 style={{ margin: "4px 0 0", fontSize: compactHeader ? 22 : 30, fontWeight: 900, lineHeight: 1.15 }}>
            {compactHeader ? "דוח סטטיסטיקות — פירוט לפי מסלול" : "דוח סטטיסטיקות"}
          </h1>
          {!compactHeader ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 500, color: MUTED }}>
              תמונת מצב לפי מסלולי גיוס והתקדמות מועמדים
            </p>
          ) : null}
        </div>
        <div style={{ textAlign: "left", fontSize: 12, color: MUTED, lineHeight: 1.6, whiteSpace: "nowrap" }}>
          <p style={{ margin: 0, fontWeight: 700, color: INK }}>{formatDate(data.generatedAt)}</p>
          <p style={{ margin: 0 }}>הופק בשעה {formatTime(data.generatedAt)}</p>
        </div>
      </header>
      <div style={{ height: 3, background: GOLD, borderRadius: 2, margin: "18px 0 24px", width: 72 }} />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>{children}</main>

      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${LINE}`,
          paddingTop: 12,
          fontSize: 11,
          color: MUTED,
        }}
      >
        <span>פותח ע״י תחום ניהו״ג · מטה הרבנות הצבאית</span>
        <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
          עמוד {pageNumber} מתוך {pageCount}
        </span>
      </footer>
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ border: `1px solid ${LINE}`, borderRadius: 18, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h2>
        {subtitle ? <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{subtitle}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Donut({ items, total }: { items: StatisticsReportData["tracks"]; total: number }) {
  const radius = 62;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;
  const arcs = items.map((item, index) => {
    const before = items.slice(0, index).reduce((sum, prev) => sum + prev.count, 0);
    return {
      ...item,
      length: total ? (item.count / total) * circumference : 0,
      offset: total ? (before / total) * circumference : 0,
    };
  });
  return (
    <svg width={176} height={176} viewBox="0 0 176 176" style={{ flexShrink: 0 }}>
      <circle cx={88} cy={88} r={radius} fill="none" stroke="#eef1f5" strokeWidth={stroke} />
      {arcs.map((arc) => (
        <circle
          key={arc.label}
          cx={88}
          cy={88}
          r={radius}
          fill="none"
          stroke={arc.color}
          strokeWidth={stroke}
          strokeDasharray={`${arc.length} ${circumference - arc.length}`}
          strokeDashoffset={-arc.offset}
          transform="rotate(-90 88 88)"
        />
      ))}
      <text x={88} y={88} textAnchor="middle" style={{ fontSize: 30, fontWeight: 900, fill: INK }}>
        {total}
      </text>
      <text x={88} y={110} textAnchor="middle" style={{ fontSize: 12, fontWeight: 600, fill: MUTED }}>
        מועמדים
      </text>
    </svg>
  );
}

function OverviewPage({ data, pageCount }: { data: StatisticsReportData; pageCount: number }) {
  const statusMax = Math.max(1, ...data.statuses.map((row) => row.count));
  return (
    <PageFrame data={data} pageNumber={1} pageCount={pageCount}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {data.kpis.map((kpi) => (
          <div
            key={kpi.label}
            style={{ border: `1px solid ${LINE}`, borderRadius: 16, padding: "14px 16px", position: "relative", overflow: "hidden" }}
          >
            <span style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 4, background: kpi.color }} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: MUTED }}>{kpi.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{kpi.value}</p>
            {kpi.label !== "סך מועמדים" ? (
              <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 700, color: kpi.color }}>
                {percent(kpi.value, data.total)} מהמועמדים
              </p>
            ) : (
              <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 700, color: MUTED }}>לא כולל טיוטות</p>
            )}
          </div>
        ))}
      </div>

      <SectionCard title="חלוקה לפי מסלול גיוס" subtitle={`${data.tracks.length} מסלולים`}>
        {data.tracks.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: MUTED }}>אין נתונים</p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <Donut items={data.tracks} total={data.total} />
            <table style={{ flex: 1, borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {data.tracks.map((track) => (
                  <tr key={track.label} style={{ borderBottom: `1px solid ${LINE}` }}>
                    <td style={{ padding: "7px 0", fontWeight: 700 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: track.color,
                          marginInlineEnd: 8,
                          verticalAlign: "middle",
                        }}
                      />
                      {track.label}
                    </td>
                    <td style={{ padding: "7px 0", textAlign: "left", fontWeight: 800, width: 56 }}>{track.count}</td>
                    <td style={{ padding: "7px 0", textAlign: "left", color: MUTED, fontWeight: 600, width: 52 }}>
                      {percent(track.count, data.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="חלוקה לפי סטטוס עבודה">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {data.statuses.map((row) => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr 84px", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{row.label}</span>
              <div style={{ height: 14, borderRadius: 999, background: "#eef1f5", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${row.count ? Math.max(2, (row.count / statusMax) * 100) : 0}%`,
                    background: STATUS_HEX[row.label],
                    borderRadius: 999,
                  }}
                />
              </div>
              <span style={{ display: "flex", justifyContent: "flex-end", gap: 8, fontSize: 13, whiteSpace: "nowrap" }}>
                <b style={{ fontWeight: 900 }}>{row.count}</b>
                <span style={{ color: MUTED, fontWeight: 600 }}>{percent(row.count, data.total)}</span>
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageFrame>
  );
}

const STATUS_COLUMNS: MalshabimCandidateStatus[] = ["בטיפול", "אושר ושובץ", "אושר ולא שובץ", "לא אושר"];

function TrackTablePage({
  data,
  rows,
  pageNumber,
  pageCount,
  showTotals,
}: {
  data: StatisticsReportData;
  rows: StatisticsReportData["trackRows"];
  pageNumber: number;
  pageCount: number;
  showTotals: boolean;
}) {
  const cell = { padding: "10px 8px", textAlign: "center" as const, fontWeight: 700 };
  const head = { ...cell, fontSize: 12, color: MUTED, fontWeight: 700, borderBottom: `2px solid ${LINE}` };
  const totals = STATUS_COLUMNS.map((status) => data.statuses.find((row) => row.label === status)?.count ?? 0);
  return (
    <PageFrame data={data} pageNumber={pageNumber} pageCount={pageCount} compactHeader>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...head, textAlign: "right" }}>מסלול גיוס</th>
            <th style={head}>סה״כ</th>
            {STATUS_COLUMNS.map((status) => (
              <th key={status} style={head}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: STATUS_HEX[status],
                    marginInlineEnd: 6,
                    verticalAlign: "middle",
                  }}
                />
                {status}
              </th>
            ))}
            <th style={head}>עברו מבחן ידע</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.label} style={{ background: index % 2 ? "#f8f9fb" : "#ffffff" }}>
              <td style={{ ...cell, textAlign: "right", fontWeight: 800 }}>{row.label}</td>
              <td style={{ ...cell, fontWeight: 900 }}>{row.total}</td>
              {STATUS_COLUMNS.map((status) => (
                <td key={status} style={{ ...cell, color: row.byStatus[status] ? INK : "#c2c7d0" }}>
                  {row.byStatus[status]}
                </td>
              ))}
              <td style={{ ...cell, whiteSpace: "nowrap" }}>
                {row.quizPassed}{" "}
                <span style={{ color: MUTED, fontWeight: 600, fontSize: 11 }}>({percent(row.quizPassed, row.total)})</span>
              </td>
            </tr>
          ))}
        </tbody>
        {showTotals ? (
          <tfoot>
            <tr style={{ borderTop: `2px solid ${NAVY}` }}>
              <td style={{ ...cell, textAlign: "right", fontWeight: 900, color: NAVY }}>סה״כ</td>
              <td style={{ ...cell, fontWeight: 900, color: NAVY }}>{data.total}</td>
              {totals.map((value, index) => (
                <td key={STATUS_COLUMNS[index]} style={{ ...cell, fontWeight: 900, color: NAVY }}>
                  {value}
                </td>
              ))}
              <td style={{ ...cell, fontWeight: 900, color: NAVY }}>
                {data.kpis.find((kpi) => kpi.label === "עברו מבחן ידע")?.value ?? 0}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </PageFrame>
  );
}

/** Off-screen A4 pages rendered only while exporting. */
export function StatisticsPdfReport({ data }: { data: StatisticsReportData }) {
  const chunks: Array<StatisticsReportData["trackRows"]> = [];
  for (let index = 0; index < data.trackRows.length; index += TABLE_ROWS_PER_PAGE) {
    chunks.push(data.trackRows.slice(index, index + TABLE_ROWS_PER_PAGE));
  }
  const pageCount = 1 + chunks.length;
  return (
    <div aria-hidden style={{ position: "fixed", top: 0, left: -20000, pointerEvents: "none" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <OverviewPage data={data} pageCount={pageCount} />
        {chunks.map((rows, index) => (
          <TrackTablePage
            key={index}
            data={data}
            rows={rows}
            pageNumber={index + 2}
            pageCount={pageCount}
            showTotals={index === chunks.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

/** Captures each rendered A4 page and writes a multi-page PDF. */
export async function saveStatisticsPdf(container: HTMLElement, fileName: string): Promise<void> {
  const pages = [...container.querySelectorAll<HTMLElement>("[data-pdf-page]")];
  if (pages.length === 0) throw new Error("אין תוכן לייצוא");
  await document.fonts?.ready;

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();

  for (const [index, page] of pages.entries()) {
    let image: string;
    try {
      image = await domToJpeg(page, { quality: 0.95, scale: 2, backgroundColor: "#ffffff" });
    } catch {
      image = await domToJpeg(page, { quality: 0.92, scale: 1, backgroundColor: "#ffffff" });
    }
    if (!image.startsWith("data:image")) throw new Error("צילום הדוח נכשל");
    if (index > 0) pdf.addPage();
    pdf.addImage(image, "JPEG", 0, 0, width, height, undefined, "FAST");
  }

  pdf.setProperties({ title: "דוח סטטיסטיקות — מלש״בים", creator: "Etur" });
  pdf.save(fileName);
}
