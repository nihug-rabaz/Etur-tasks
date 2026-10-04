import { readFileSync } from "node:fs";
import path from "node:path";

export type TodolistCardItem = {
  title: string;
  timeLabel: string;
  kind: "task" | "schedule";
  done?: boolean;
};

export type TodolistCardInput = {
  userName: string;
  dayLabel: string;
  items: TodolistCardItem[];
};

/** OneSignal / Android expanded preview works best at ~1024×512 (2:1). */
const WIDTH = 1024;
const HEIGHT = 512;
const PADDING_X = 40;
const HEADER_Y = 28;
const LIST_TOP = 128;
const ROW_HEIGHT = 58;
const MAX_VISIBLE = 6;
const FONT_PATH = path.join(process.cwd(), "public/fonts/NotoSansHebrew-Regular.ttf");

let cachedFontCss: string | null = null;

function fontFaceCss(): string {
  if (cachedFontCss) return cachedFontCss;
  const base64 = readFileSync(FONT_PATH).toString("base64");
  cachedFontCss = `@font-face{font-family:'NotoSansHebrew';src:url('data:font/ttf;base64,${base64}') format('truetype');font-weight:400;font-style:normal;}`;
  return cachedFontCss;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function buildSvg(input: TodolistCardInput): string {
  const visible = input.items.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, input.items.length - visible.length);
  const colWidth = (WIDTH - PADDING_X * 2 - 16) / 2;

  const rows =
    visible.length === 0
      ? `<g>
          <rect x="${PADDING_X}" y="${LIST_TOP}" width="${WIDTH - PADDING_X * 2}" height="280" rx="22" fill="#F8FAFC"/>
          <text x="${WIDTH / 2}" y="${LIST_TOP + 150}" text-anchor="middle" class="empty">אין משימות להיום — יום פנוי ✨</text>
        </g>`
      : visible
          .map((item, index) => {
            const col = index < 3 ? 1 : 0; // RTL: fill right column first
            const row = index % 3;
            const x = PADDING_X + col * (colWidth + 16);
            const y = LIST_TOP + row * ROW_HEIGHT;
            const kindLabel = item.kind === "schedule" ? "לו״ז" : "משימה";
            const checkFill = item.done ? "#0F766E" : "#FFFFFF";
            const checkStroke = item.done ? "#0F766E" : "#CBD5E1";
            const titleClass = item.done ? "title-done" : "title";
            const checkMark = item.done
              ? `<path d="M${x + colWidth - 34} ${y + 26} l5 5 l10 -12" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
              : "";
            return `<g>
              <rect x="${x}" y="${y}" width="${colWidth}" height="50" rx="14" fill="#FFFFFF" stroke="#E2E8F0"/>
              <circle cx="${x + colWidth - 24}" cy="${y + 25}" r="11" fill="${checkFill}" stroke="${checkStroke}" stroke-width="2"/>
              ${checkMark}
              <text x="${x + colWidth - 46}" y="${y + 21}" text-anchor="end" class="${titleClass}">${escapeXml(truncate(item.title, 28))}</text>
              <text x="${x + colWidth - 46}" y="${y + 39}" text-anchor="end" class="meta">${escapeXml(kindLabel)} · ${escapeXml(truncate(item.timeLabel, 22))}</text>
            </g>`;
          })
          .join("\n");

  const overflowLabel =
    overflow > 0
      ? `<text x="${PADDING_X}" y="${HEIGHT - 28}" text-anchor="start" class="footer">+${overflow} נוספות באפליקציה</text>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E7F6F2"/>
      <stop offset="100%" stop-color="#F4F8FB"/>
    </linearGradient>
    <style>
      ${fontFaceCss()}
      text { font-family: 'NotoSansHebrew', Arial, sans-serif; direction: rtl; }
      .brand { font-size: 18px; fill: #0F766E; }
      .heading { font-size: 36px; fill: #0F172A; }
      .subtitle { font-size: 16px; fill: #64748B; }
      .title { font-size: 17px; fill: #0F172A; }
      .title-done { font-size: 17px; fill: #94A3B8; }
      .meta { font-size: 12px; fill: #64748B; }
      .empty { font-size: 22px; fill: #64748B; }
      .footer { font-size: 13px; fill: #94A3B8; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="18" y="18" width="${WIDTH - 36}" height="${HEIGHT - 36}" rx="28" fill="#FBFFFE" stroke="#D1E7E1"/>
  <text x="${WIDTH - PADDING_X}" y="${HEADER_Y + 18}" text-anchor="end" class="brand">etur · רשימת משימות</text>
  <text x="${WIDTH - PADDING_X}" y="${HEADER_Y + 56}" text-anchor="end" class="heading">המשימות שלי להיום</text>
  <text x="${WIDTH - PADDING_X}" y="${HEADER_Y + 82}" text-anchor="end" class="subtitle">${escapeXml(truncate(input.userName, 24))} · ${escapeXml(input.dayLabel)}</text>
  ${rows}
  ${overflowLabel}
  <text x="${WIDTH - PADDING_X}" y="${HEIGHT - 28}" text-anchor="end" class="footer">גררו את ההתראה כדי לראות את הרשימה</text>
</svg>`;
}

export async function renderTodolistCardImage(
  input: TodolistCardInput,
): Promise<{ buffer: Buffer; contentType: "image/jpeg"; extension: "jpg" }> {
  const sharp = (await import("sharp")).default;
  const svg = buildSvg(input);
  const buffer = await sharp(Buffer.from(svg))
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  return { buffer, contentType: "image/jpeg", extension: "jpg" };
}

/** @deprecated Use renderTodolistCardImage */
export async function renderTodolistCardPng(input: TodolistCardInput): Promise<Buffer> {
  const image = await renderTodolistCardImage(input);
  return image.buffer;
}
