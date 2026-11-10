"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Check,
  Circle,
  Copy,
  Eraser,
  EyeOff,
  Highlighter,
  Hash,
  Minus,
  MousePointer2,
  PaintBucket,
  Pencil,
  Pipette,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";

type Tool =
  | "select"
  | "pen"
  | "highlighter"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "marker"
  | "redact"
  | "eraser";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

type StrokeItem = {
  id: string;
  kind: "stroke";
  tool: "pen" | "highlighter" | "eraser";
  color: string;
  width: number;
  points: Point[];
};

type ShapeItem = {
  id: string;
  kind: "shape";
  tool: "rect" | "ellipse" | "line" | "arrow";
  color: string;
  width: number;
  from: Point;
  to: Point;
  filled?: boolean;
};

type TextItem = {
  id: string;
  kind: "text";
  color: string;
  size: number;
  at: Point;
  text: string;
};

type MarkerItem = {
  id: string;
  kind: "marker";
  color: string;
  size: number;
  at: Point;
  number: number;
};

type RedactItem = {
  id: string;
  kind: "redact";
  from: Point;
  to: Point;
};

type BoardItem = StrokeItem | ShapeItem | TextItem | MarkerItem | RedactItem;

type ResizeHandle = "se" | "nw" | "ne" | "sw";

type DragMode =
  | { type: "move"; id: string; start: Point; origin: BoardItem }
  | {
      type: "resize";
      id: string;
      start: Point;
      origin: BoardItem;
      handle: ResizeHandle;
    }
  | null;

const COLORS = [
  "#e11d48",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#111827",
  "#ffffff",
];
const HANDLE = 10;

type PaintCtx = {
  bg: HTMLImageElement | null;
  viewW: number;
  viewH: number;
};

function uid() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

function inflate(r: Rect, pad: number): Rect {
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
}

function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
}

function textBoxPad(size: number) {
  return Math.max(8, Math.round(size * 0.32));
}

/** Rectangular text-box bounds (Photoshop-style), including padding. */
function measureText(ctx: CanvasRenderingContext2D, item: TextItem): Rect {
  const hasHebrew = /[\u0590-\u05FF]/.test(item.text);
  ctx.save();
  ctx.font = `bold ${item.size}px "Segoe UI", Arial, sans-serif`;
  const metrics = ctx.measureText(item.text || " ");
  const glyphW = Math.max(metrics.width, item.size * 0.6);
  const glyphH = item.size * 1.25;
  ctx.restore();
  const pad = textBoxPad(item.size);
  const glyph: Rect = hasHebrew
    ? { x: item.at.x - glyphW, y: item.at.y, w: glyphW, h: glyphH }
    : { x: item.at.x, y: item.at.y, w: glyphW, h: glyphH };
  return inflate(glyph, pad);
}

function itemBounds(ctx: CanvasRenderingContext2D, item: BoardItem): Rect {
  if (item.kind === "text") return measureText(ctx, item);
  if (item.kind === "marker") {
    const r = item.size;
    return { x: item.at.x - r, y: item.at.y - r, w: r * 2, h: r * 2 };
  }
  if (item.kind === "redact") {
    return inflate(normalizeRect(item.from, item.to), 2);
  }
  if (item.kind === "shape") {
    if (item.tool === "line" || item.tool === "arrow") {
      return inflate(normalizeRect(item.from, item.to), Math.max(10, item.width));
    }
    return inflate(normalizeRect(item.from, item.to), item.width);
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of item.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!item.points.length) return { x: 0, y: 0, w: 0, h: 0 };
  return inflate(
    { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    Math.max(8, item.width),
  );
}

function moveItem(item: BoardItem, dx: number, dy: number): BoardItem {
  if (item.kind === "text" || item.kind === "marker") {
    return { ...item, at: { x: item.at.x + dx, y: item.at.y + dy } };
  }
  if (item.kind === "shape" || item.kind === "redact") {
    return {
      ...item,
      from: { x: item.from.x + dx, y: item.from.y + dy },
      to: { x: item.to.x + dx, y: item.to.y + dy },
    };
  }
  return {
    ...item,
    points: item.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  };
}

function resizeCorners(
  originFrom: Point,
  originTo: Point,
  dx: number,
  dy: number,
  handle: ResizeHandle,
): { from: Point; to: Point } {
  let from = { ...originFrom };
  let to = { ...originTo };
  if (handle === "se") {
    to = { x: originTo.x + dx, y: originTo.y + dy };
  } else if (handle === "nw") {
    from = { x: originFrom.x + dx, y: originFrom.y + dy };
  } else if (handle === "ne") {
    to = { x: originTo.x + dx, y: to.y };
    from = { x: from.x, y: originFrom.y + dy };
  } else if (handle === "sw") {
    from = { x: originFrom.x + dx, y: from.y };
    to = { x: to.x, y: originTo.y + dy };
  }
  return { from, to };
}

function resizeItem(
  item: BoardItem,
  origin: BoardItem,
  start: Point,
  now: Point,
  handle: ResizeHandle,
): BoardItem {
  const dx = now.x - start.x;
  const dy = now.y - start.y;
  if (origin.kind === "text") {
    const delta = handle === "nw" || handle === "ne" ? -dy : dy;
    const nextSize = Math.max(14, Math.min(96, origin.size + delta * 0.4));
    return { ...item, size: nextSize } as TextItem;
  }
  if (origin.kind === "marker") {
    const delta = handle === "nw" || handle === "ne" ? -dy : dy;
    const nextSize = Math.max(12, Math.min(64, origin.size + delta * 0.35));
    return { ...item, size: nextSize } as MarkerItem;
  }
  if (origin.kind === "shape" || origin.kind === "redact") {
    const { from, to } = resizeCorners(origin.from, origin.to, dx, dy, handle);
    return { ...item, from, to } as typeof origin;
  }
  if (origin.kind !== "stroke") return item;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return item;
  const bounds = itemBounds(ctx, origin);
  if (bounds.w < 2 || bounds.h < 2) return moveItem(item, dx, dy);
  const signedDx = handle === "nw" || handle === "sw" ? -dx : dx;
  const signedDy = handle === "nw" || handle === "ne" ? -dy : dy;
  const scaleX = Math.max(0.2, (bounds.w + signedDx) / bounds.w);
  const scaleY = Math.max(0.2, (bounds.h + signedDy) / bounds.h);
  const anchorX = handle === "nw" || handle === "sw" ? bounds.x + bounds.w : bounds.x;
  const anchorY = handle === "nw" || handle === "ne" ? bounds.y + bounds.h : bounds.y;
  return {
    ...item,
    width: Math.max(1, origin.width * ((scaleX + scaleY) / 2)),
    points: origin.points.map((p) => ({
      x: anchorX + (p.x - anchorX) * scaleX,
      y: anchorY + (p.y - anchorY) * scaleY,
    })),
  } as StrokeItem;
}

function drawArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = Math.max(12, ctx.lineWidth * 3);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - head * Math.cos(angle - Math.PI / 6),
    to.y - head * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    to.x - head * Math.cos(angle + Math.PI / 6),
    to.y - head * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function paintRedact(
  ctx: CanvasRenderingContext2D,
  item: RedactItem,
  paint: PaintCtx,
) {
  const r = normalizeRect(item.from, item.to);
  if (r.w < 2 || r.h < 2) return;
  ctx.save();
  if (paint.bg && paint.viewW > 0 && paint.viewH > 0) {
    const sx = (r.x / paint.viewW) * paint.bg.naturalWidth;
    const sy = (r.y / paint.viewH) * paint.bg.naturalHeight;
    const sw = (r.w / paint.viewW) * paint.bg.naturalWidth;
    const sh = (r.h / paint.viewH) * paint.bg.naturalHeight;
    const tmp = document.createElement("canvas");
    const pixel = 12;
    tmp.width = Math.max(1, Math.round(r.w / pixel));
    tmp.height = Math.max(1, Math.round(r.h / pixel));
    const tctx = tmp.getContext("2d");
    if (tctx) {
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(paint.bg, sx, sy, sw, sh, 0, 0, tmp.width, tmp.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, r.x, r.y, r.w, r.h);
      ctx.imageSmoothingEnabled = true;
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
      return;
    }
  }
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

function paintItem(
  ctx: CanvasRenderingContext2D,
  item: BoardItem,
  paint: PaintCtx,
) {
  if (item.kind === "stroke") {
    if (item.points.length < 2) return;
    ctx.save();
    if (item.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (item.tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = item.color;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = item.color;
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = item.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(item.points[0].x, item.points[0].y);
    for (let i = 1; i < item.points.length; i += 1) {
      ctx.lineTo(item.points[i].x, item.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (item.kind === "text") {
    ctx.save();
    const hasHebrew = /[\u0590-\u05FF]/.test(item.text);
    const box = measureText(ctx, item);
    const pad = textBoxPad(item.size);
    const light = isLightColor(item.color);
    // Photoshop-like rectangular text plate.
    ctx.fillStyle = light ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.94)";
    ctx.strokeStyle = item.color;
    ctx.lineWidth = Math.max(2, Math.round(item.size / 14));
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.fill();
    ctx.stroke();
    ctx.font = `bold ${item.size}px "Segoe UI", Arial, sans-serif`;
    ctx.textBaseline = "top";
    ctx.direction = hasHebrew ? "rtl" : "ltr";
    ctx.textAlign = hasHebrew ? "right" : "left";
    ctx.fillStyle = item.color;
    const tx = hasHebrew ? box.x + box.w - pad : box.x + pad;
    const ty = box.y + pad;
    ctx.fillText(item.text, tx, ty);
    ctx.restore();
    return;
  }

  if (item.kind === "marker") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(item.at.x, item.at.y, item.size, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.max(12, Math.round(item.size * 0.9))}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(item.number), item.at.x, item.at.y + 1);
    ctx.restore();
    return;
  }

  if (item.kind === "redact") {
    paintRedact(ctx, item, paint);
    return;
  }

  ctx.save();
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = item.width;
  ctx.lineCap = "round";
  const { from, to } = item;
  if (item.tool === "rect") {
    if (item.filled) {
      ctx.globalAlpha = 0.28;
      ctx.fillRect(from.x, from.y, to.x - from.x, to.y - from.y);
      ctx.globalAlpha = 1;
    }
    ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
  } else if (item.tool === "ellipse") {
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2;
    const rx = Math.abs(to.x - from.x) / 2;
    const ry = Math.abs(to.y - from.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
    if (item.filled) {
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  } else if (item.tool === "line") {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  } else if (item.tool === "arrow") {
    drawArrow(ctx, from, to);
  }
  ctx.restore();
}

function paintSelection(ctx: CanvasRenderingContext2D, bounds: Rect) {
  ctx.save();
  // Solid rectangular transform box (Photoshop-style), readable on any bg.
  ctx.strokeStyle = "rgba(15, 23, 42, 0.8)";
  ctx.lineWidth = 3;
  ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  const corners: Point[] = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.w, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.h },
    { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
  ];
  for (const c of corners) {
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(c.x - HANDLE / 2, c.y - HANDLE / 2, HANDLE, HANDLE);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function hitHandle(p: Point, bounds: Rect): ResizeHandle | null {
  const spots: Array<{ handle: ResizeHandle; pt: Point }> = [
    { handle: "nw", pt: { x: bounds.x, y: bounds.y } },
    { handle: "ne", pt: { x: bounds.x + bounds.w, y: bounds.y } },
    { handle: "sw", pt: { x: bounds.x, y: bounds.y + bounds.h } },
    { handle: "se", pt: { x: bounds.x + bounds.w, y: bounds.y + bounds.h } },
  ];
  for (const s of spots) {
    if (Math.hypot(p.x - s.pt.x, p.y - s.pt.y) <= HANDLE + 4) return s.handle;
  }
  return null;
}

type Props = {
  imageDataUrl: string;
  onCancel: () => void;
  onSave: (annotatedDataUrl: string) => void;
};

export function ScreenshotWhiteboard({ imageDataUrl, onCancel, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(4);
  const [fillShapes, setFillShapes] = useState(false);
  const [markerSeq, setMarkerSeq] = useState(1);
  const [items, setItems] = useState<BoardItem[]>([]);
  const [redoStack, setRedoStack] = useState<BoardItem[][]>([]);
  const [undoStack, setUndoStack] = useState<BoardItem[][]>([]);
  const [draft, setDraft] = useState<BoardItem | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const drawing = useRef(false);
  const dragRef = useRef<DragMode>(null);
  const itemsBeforeDrag = useRef<BoardItem[] | null>(null);
  const [textDraft, setTextDraft] = useState<{
    at: Point;
    value: string;
    editId?: string;
  } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const styleBeforeRef = useRef<BoardItem[] | null>(null);
  const naturalSize = useRef({ w: 1280, h: 720 });

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const commitHistory = useCallback((next: BoardItem[]) => {
    setUndoStack((u) => [...u, items]);
    setRedoStack([]);
    setItems(next);
  }, [items]);

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = bgRef.current;
    if (!canvas || !img) return;
    const chromeH = chromeRef.current?.offsetHeight ?? 140;
    const maxW = Math.min(window.innerWidth - 24, img.naturalWidth || 1600);
    const maxH = Math.min(
      Math.max(180, window.innerHeight - chromeH - 16),
      img.naturalHeight || 900,
    );
    const scale = Math.min(
      maxW / Math.max(img.naturalWidth, 1),
      maxH / Math.max(img.naturalHeight, 1),
      1,
    );
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    naturalSize.current = { w: img.naturalWidth, h: img.naturalHeight };
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }, []);

  const toCanvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const hitTest = useCallback(
    (p: Point): BoardItem | null => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return null;
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const item = items[i];
        if (item.kind === "stroke" && item.tool === "eraser") continue;
        const b = itemBounds(ctx, item);
        if (pointInRect(p, b)) return item;
      }
      return null;
    },
    [items],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = bgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const paint: PaintCtx = { bg: img, viewW: canvas.width, viewH: canvas.height };
    for (const item of items) paintItem(ctx, item, paint);
    if (draft) paintItem(ctx, draft, paint);
    if (selected) {
      paintSelection(ctx, itemBounds(ctx, selected));
    }
    if (textDraft && !textDraft.editId) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(textDraft.at.x, textDraft.at.y, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [items, draft, selected, textDraft, color]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      bgRef.current = img;
      fitCanvas();
      setReady(true);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, fitCanvas]);

  useEffect(() => {
    if (!ready) return;
    redraw();
  }, [ready, redraw]);

  useEffect(() => {
    if (!ready) return;
    // Refit when chrome height changes (selection/text strips), not on every stroke.
    fitCanvas();
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: chrome toggles only
  }, [ready, selectedId, textDraft, tool, fitCanvas]);

  useEffect(() => {
    const onResize = () => {
      fitCanvas();
      redraw();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitCanvas, redraw]);

  useEffect(() => {
    if (!textDraft) return;
    const id = window.setTimeout(() => textInputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [textDraft]);

  useEffect(() => {
    if (!selected) return;
    if (selected.kind === "text") {
      setColor(selected.color);
      setLineWidth(Math.max(2, Math.min(16, Math.round(selected.size / 6))));
      return;
    }
    if (selected.kind === "marker") {
      setColor(selected.color);
      setLineWidth(Math.max(2, Math.min(16, Math.round(selected.size / 2))));
      return;
    }
    if (selected.kind === "shape") {
      setColor(selected.color);
      setLineWidth(selected.width);
      setFillShapes(Boolean(selected.filled));
      return;
    }
    if (selected.kind === "redact") return;
    if (selected.kind === "stroke" && selected.tool === "eraser") return;
    setColor(selected.color);
    setLineWidth(selected.width);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushItem = (item: BoardItem) => {
    commitHistory([...items, item]);
    // Keep draw tools active for continuous annotation; only select new text.
    if (item.kind === "text") {
      setSelectedId(item.id);
      setTool("select");
    } else {
      setSelectedId(null);
    }
  };

  const updateSelected = (mutator: (item: BoardItem) => BoardItem) => {
    if (!selectedId) return;
    commitHistory(
      items.map((item) => (item.id === selectedId ? mutator(item) : item)),
    );
  };

  const previewSelected = (mutator: (item: BoardItem) => BoardItem) => {
    if (!selectedId) return;
    if (!styleBeforeRef.current) styleBeforeRef.current = items;
    setItems((prev) =>
      prev.map((item) => (item.id === selectedId ? mutator(item) : item)),
    );
  };

  const commitStylePreview = () => {
    if (!styleBeforeRef.current) return;
    setUndoStack((u) => [...u, styleBeforeRef.current!]);
    setRedoStack([]);
    styleBeforeRef.current = null;
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    commitHistory(items.filter((i) => i.id !== selectedId));
    setSelectedId(null);
    setTextDraft(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const clone = moveItem(
      { ...structuredClone(selected), id: uid() } as BoardItem,
      24,
      24,
    );
    commitHistory([...items, clone]);
    setSelectedId(clone.id);
    setTool("select");
  };

  const applyColor = (next: string) => {
    setColor(next);
    if (!selected) return;
    if (selected.kind === "redact") return;
    if (selected.kind === "stroke" && selected.tool === "eraser") return;
    updateSelected((item) => {
      if (item.kind === "redact") return item;
      if (item.kind === "stroke" && item.tool === "eraser") return item;
      return { ...item, color: next };
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!selectedId) return;
      e.preventDefault();
      deleteSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(event);
    if (!point) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (tool === "select") {
      if (selected && ctx) {
        const bounds = itemBounds(ctx, selected);
        const handle = hitHandle(point, bounds);
        if (handle) {
          canvas?.setPointerCapture(event.pointerId);
          drawing.current = true;
          itemsBeforeDrag.current = items;
          dragRef.current = {
            type: "resize",
            id: selected.id,
            start: point,
            origin: structuredClone(selected),
            handle,
          };
          return;
        }
        if (pointInRect(point, bounds)) {
          canvas?.setPointerCapture(event.pointerId);
          drawing.current = true;
          itemsBeforeDrag.current = items;
          dragRef.current = {
            type: "move",
            id: selected.id,
            start: point,
            origin: structuredClone(selected),
          };
          return;
        }
      }
      const hit = hitTest(point);
      setSelectedId(hit?.id ?? null);
      if (hit) {
        canvas?.setPointerCapture(event.pointerId);
        drawing.current = true;
        itemsBeforeDrag.current = items;
        dragRef.current = {
          type: "move",
          id: hit.id,
          start: point,
          origin: structuredClone(hit),
        };
      }
      return;
    }

    if (tool === "text") {
      event.preventDefault();
      const hit = hitTest(point);
      if (hit?.kind === "text") {
        setSelectedId(hit.id);
        setTextDraft({ at: hit.at, value: hit.text, editId: hit.id });
        return;
      }
      setTextDraft({ at: point, value: textDraft?.value ?? "" });
      return;
    }

    if (tool === "marker") {
      event.preventDefault();
      const number = markerSeq;
      setMarkerSeq((n) => n + 1);
      pushItem({
        id: uid(),
        kind: "marker",
        color,
        size: Math.max(14, lineWidth * 3),
        at: point,
        number,
      });
      return;
    }

    canvas?.setPointerCapture(event.pointerId);
    drawing.current = true;
    setSelectedId(null);
    if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
      setDraft({
        id: uid(),
        kind: "stroke",
        tool,
        color,
        width:
          tool === "highlighter"
            ? lineWidth * 3
            : tool === "eraser"
              ? lineWidth * 4
              : lineWidth,
        points: [point],
      });
      return;
    }

    if (tool === "redact") {
      setDraft({
        id: uid(),
        kind: "redact",
        from: point,
        to: point,
      });
      return;
    }

    if (tool === "rect" || tool === "ellipse" || tool === "line" || tool === "arrow") {
      setDraft({
        id: uid(),
        kind: "shape",
        tool,
        color,
        width: lineWidth,
        from: point,
        to: point,
        filled: fillShapes && (tool === "rect" || tool === "ellipse"),
      });
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(event);
    if (!point) return;

    if (tool === "select" && drawing.current && dragRef.current) {
      const drag = dragRef.current;
      if (drag.type === "move") {
        const dx = point.x - drag.start.x;
        const dy = point.y - drag.start.y;
        setItems((prev) =>
          prev.map((item) =>
            item.id === drag.id ? moveItem(drag.origin, dx, dy) : item,
          ),
        );
        return;
      }
      if (drag.type === "resize") {
        setItems((prev) =>
          prev.map((item) =>
            item.id === drag.id
              ? resizeItem(item, drag.origin, drag.start, point, drag.handle)
              : item,
          ),
        );
        return;
      }
    }

    if (!drawing.current || !draft) return;
    if (draft.kind === "stroke") {
      setDraft({ ...draft, points: [...draft.points, point] });
      return;
    }
    if (draft.kind === "shape" || draft.kind === "redact") {
      setDraft({ ...draft, to: point });
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    try {
      canvasRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    if (tool === "select" && dragRef.current) {
      if (itemsBeforeDrag.current) {
        const before = itemsBeforeDrag.current;
        const changed = JSON.stringify(before) !== JSON.stringify(items);
        if (changed) {
          setUndoStack((u) => [...u, before]);
          setRedoStack([]);
        }
        itemsBeforeDrag.current = null;
      }
      dragRef.current = null;
      drawing.current = false;
      return;
    }

    drawing.current = false;
    if (draft) {
      pushItem(draft);
      setDraft(null);
    }
  };

  const onDoubleClick = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(event);
    if (!point) return;
    const hit = hitTest(point);
    if (hit?.kind === "text") {
      setTool("select");
      setSelectedId(hit.id);
      setTextDraft({ at: hit.at, value: hit.text, editId: hit.id });
    }
  };

  const commitText = () => {
    if (!textDraft) return;
    const text = textDraft.value.trim();
    if (!text) {
      setTextDraft(null);
      return;
    }
    if (textDraft.editId) {
      commitHistory(
        items.map((item) =>
          item.id === textDraft.editId && item.kind === "text"
            ? { ...item, text, color, size: Math.max(14, lineWidth * 6) }
            : item,
        ),
      );
      setSelectedId(textDraft.editId);
      setTextDraft(null);
      setTool("select");
      return;
    }
    pushItem({
      id: uid(),
      kind: "text",
      color,
      size: Math.max(14, lineWidth * 6),
      at: textDraft.at,
      text,
    });
    setTextDraft(null);
  };

  const undo = () => {
    setUndoStack((u) => {
      if (!u.length) return u;
      const prev = u[u.length - 1];
      setRedoStack((r) => [...r, items]);
      setItems(prev);
      return u.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((r) => {
      if (!r.length) return r;
      const next = r[r.length - 1];
      setUndoStack((u) => [...u, items]);
      setItems(next);
      return r.slice(0, -1);
    });
  };

  const clearAll = () => {
    commitHistory([]);
    setDraft(null);
    setSelectedId(null);
    setTextDraft(null);
    setMarkerSeq(1);
  };

  const exportAnnotated = () => {
    const img = bgRef.current;
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = img.naturalWidth || naturalSize.current.w;
    out.height = img.naturalHeight || naturalSize.current.h;
    const ctx = out.getContext("2d");
    const view = canvasRef.current;
    if (!ctx || !view) return;
    const sx = out.width / view.width;
    const sy = out.height / view.height;
    ctx.drawImage(img, 0, 0, out.width, out.height);
    ctx.save();
    ctx.scale(sx, sy);
    const paint: PaintCtx = {
      bg: img,
      viewW: view.width,
      viewH: view.height,
    };
    for (const item of items) paintItem(ctx, item, paint);
    ctx.restore();
    onSave(out.toDataURL("image/jpeg", 0.92));
  };

  const toolBtn = (id: Tool, label: string, icon: ReactNode) => (
    <button
      key={id}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={tool === id}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${
        tool === id
          ? "bg-blue-600 text-white shadow-sm ring-2 ring-sky-300/50"
          : "bg-white/5 text-white/85 hover:bg-white/12 hover:text-white"
      }`}
      onClick={() => {
        setTool(id);
        if (id !== "select") setSelectedId(null);
      }}
    >
      {icon}
    </button>
  );

  const divider = <div className="hidden h-7 w-px bg-white/15 sm:block" aria-hidden />;

  const toolHint =
    tool === "text" && !textDraft
      ? "לחצו על הצילום להוספת טקסט, או על טקסט קיים לעריכה"
      : tool === "marker"
        ? "לחצו על הצילום להוספת מספר סידורי (1, 2, 3…)"
        : tool === "redact"
          ? "גררו מלבן להסתרת / טשטוש אזור רגיש"
          : tool === "select"
            ? "גררו להזזה · ידיות לשינוי גודל · דאבל־קליק לעריכת טקסט"
            : null;

  const openSelectedTextEdit = () => {
    if (!selected || selected.kind !== "text") return;
    setTextDraft({ at: selected.at, value: selected.text, editId: selected.id });
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-[#0b1220]/[0.97] text-white"
      dir="rtl"
      data-dev-feedback-overlay="true"
    >
      <div ref={chromeRef}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight sm:text-base">
            סימון על הצילום
          </h2>
          {toolHint ? (
            <p className="mt-0.5 truncate text-[11px] text-white/45">{toolHint}</p>
          ) : (
            <p className="mt-0.5 text-[11px] text-white/45">סמנו ואז שמרו את הסימון לטופס</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm text-white/85 hover:bg-white/10"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
            ביטול
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold shadow-sm hover:bg-emerald-500"
            onClick={exportAnnotated}
          >
            <Check className="h-4 w-4" />
            שמור סימון
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="inline-flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          {toolBtn("select", "בחירה / הזזה", <MousePointer2 className="h-4 w-4" />)}
        </div>

        {divider}

        <div className="inline-flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          {toolBtn("pen", "עט", <Pencil className="h-4 w-4" />)}
          {toolBtn("highlighter", "מרקר", <Highlighter className="h-4 w-4" />)}
          {toolBtn("eraser", "מחק", <Eraser className="h-4 w-4" />)}
        </div>

        {divider}

        <div className="inline-flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          {toolBtn("rect", "מלבן", <Square className="h-4 w-4" />)}
          {toolBtn("ellipse", "עיגול", <Circle className="h-4 w-4" />)}
          {toolBtn("line", "קו", <Minus className="h-4 w-4" />)}
          {toolBtn("arrow", "חץ", <ArrowUpRight className="h-4 w-4" />)}
          <button
            type="button"
            title="מילוי צורות"
            aria-label="מילוי צורות"
            aria-pressed={fillShapes}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${
              fillShapes
                ? "bg-blue-600 text-white shadow-sm ring-2 ring-sky-300/50"
                : "bg-white/5 text-white/85 hover:bg-white/12"
            }`}
            onClick={() => {
              const next = !fillShapes;
              setFillShapes(next);
              if (selected?.kind === "shape" && (selected.tool === "rect" || selected.tool === "ellipse")) {
                updateSelected((item) =>
                  item.kind === "shape" ? { ...item, filled: next } : item,
                );
              }
            }}
          >
            <PaintBucket className="h-4 w-4" />
          </button>
        </div>

        {divider}

        <div className="inline-flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          {toolBtn("text", "טקסט", <Type className="h-4 w-4" />)}
          {toolBtn("marker", "מספר סידורי", <Hash className="h-4 w-4" />)}
          {toolBtn("redact", "הסתרה / טשטוש", <EyeOff className="h-4 w-4" />)}
        </div>

        {divider}

        <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.04] px-2 py-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {COLORS.map((c) => {
              const active = color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  className={`relative h-7 w-7 rounded-full transition ${
                    active ? "scale-110 ring-2 ring-sky-300 ring-offset-2 ring-offset-[#0b1220]" : "opacity-80 hover:opacity-100"
                  } ${c === "#ffffff" ? "border border-white/40" : ""} ${c === "#111827" ? "border border-white/25" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => applyColor(c)}
                  aria-label={`צבע ${c}`}
                  aria-pressed={active}
                />
              );
            })}
            <label
              className="relative inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-white/35 bg-white/5 hover:bg-white/10"
              title="בחירת צבע חופשי"
            >
              <Pipette className="h-3.5 w-3.5 text-white/80" />
              <input
                type="color"
                className="absolute inset-0 cursor-pointer opacity-0"
                value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#e11d48"}
                aria-label="בחירת צבע חופשי"
                onChange={(e) => applyColor(e.target.value)}
              />
            </label>
          </div>
          <div className="flex items-center gap-2 border-s border-white/10 ps-2">
            <span className="text-[11px] text-white/55">
              {selected?.kind === "text" || selected?.kind === "marker" || tool === "marker"
                ? "גודל"
                : "עובי"}
            </span>
            <input
              type="range"
              className="h-1.5 w-24 accent-sky-400"
              min={2}
              max={16}
              value={lineWidth}
              aria-label={
                selected?.kind === "text" || selected?.kind === "marker"
                  ? "גודל"
                  : "עובי קו"
              }
              onPointerDown={() => {
                if (selectedId) styleBeforeRef.current = items;
              }}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLineWidth(v);
                if (selected?.kind === "text") {
                  previewSelected((item) =>
                    item.kind === "text" ? { ...item, size: Math.max(14, v * 6) } : item,
                  );
                } else if (selected?.kind === "marker") {
                  previewSelected((item) =>
                    item.kind === "marker" ? { ...item, size: Math.max(12, v * 2) } : item,
                  );
                } else if (selected?.kind === "shape") {
                  previewSelected((item) =>
                    item.kind === "shape" ? { ...item, width: v } : item,
                  );
                } else if (selected?.kind === "stroke" && selected.tool !== "eraser") {
                  previewSelected((item) =>
                    item.kind === "stroke" ? { ...item, width: v } : item,
                  );
                }
              }}
              onPointerUp={commitStylePreview}
              onPointerCancel={commitStylePreview}
            />
            <span
              className="inline-block rounded-full bg-current"
              style={{
                color,
                width: Math.max(6, selected?.kind === "text" || selected?.kind === "marker" ? 10 : lineWidth),
                height: Math.max(6, selected?.kind === "text" || selected?.kind === "marker" ? 10 : lineWidth),
              }}
              aria-hidden
            />
          </div>
        </div>

        <div className="ms-auto inline-flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/80 hover:bg-white/12 disabled:opacity-35"
            onClick={undo}
            disabled={!undoStack.length}
            title="בטל"
            aria-label="בטל"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/80 hover:bg-white/12 disabled:opacity-35"
            onClick={redo}
            disabled={!redoStack.length}
            title="בצע שוב"
            aria-label="בצע שוב"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="h-9 rounded-lg px-2.5 text-xs text-white/65 hover:bg-white/10 hover:text-white"
            onClick={clearAll}
          >
            נקה הכל
          </button>
        </div>
      </div>

      {selected && !textDraft ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-sky-500/10 px-3 py-1.5 sm:px-4">
          <span className="text-[11px] font-medium text-sky-100/90">
            {selected.kind === "marker"
              ? `מספר ${selected.number}`
              : selected.kind === "redact"
                ? "אזור מוסתר"
                : "אלמנט נבחר"}
          </span>
          {selected.kind === "text" ? (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2.5 text-xs font-medium hover:bg-white/15"
              onClick={openSelectedTextEdit}
            >
              <Type className="h-3.5 w-3.5" />
              ערוך טקסט
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2.5 text-xs font-medium hover:bg-white/15"
            onClick={duplicateSelected}
          >
            <Copy className="h-3.5 w-3.5" />
            שכפל
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 text-xs font-medium text-rose-100 hover:bg-rose-500/30"
            onClick={deleteSelected}
          >
            <Trash2 className="h-3.5 w-3.5" />
            מחק
          </button>
        </div>
      ) : null}

      {textDraft ? (
        <div className="z-[100] flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#111827] px-3 py-2.5 sm:px-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-sky-200">
            <Type className="h-4 w-4" />
          </div>
          <input
            ref={textInputRef}
            className="min-w-[12rem] flex-1 rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-sky-400"
            value={textDraft.value}
            placeholder="הקלידו כאן טקסט לסימון…"
            dir="auto"
            onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitText();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setTextDraft(null);
              }
            }}
          />
          <button
            type="button"
            className="h-9 rounded-xl bg-blue-600 px-3 text-sm font-semibold hover:bg-blue-500"
            onClick={commitText}
          >
            {textDraft.editId ? "עדכן טקסט" : "הוסף טקסט"}
          </button>
          <button
            type="button"
            className="h-9 rounded-xl border border-white/15 px-3 text-sm text-white/80 hover:bg-white/10"
            onClick={() => setTextDraft(null)}
          >
            ביטול
          </button>
        </div>
      ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(ellipse_at_center,rgba(30,41,59,0.55),transparent_65%)] p-3 sm:p-4">
        <canvas
          ref={canvasRef}
          className={`max-h-full max-w-full rounded-xl bg-black shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/10 touch-none ${
            tool === "text"
              ? "cursor-text"
              : tool === "select"
                ? "cursor-default"
                : "cursor-crosshair"
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        />
      </div>
    </div>
  );
}
