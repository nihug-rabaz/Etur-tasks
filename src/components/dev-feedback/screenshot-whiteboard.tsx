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
  Eraser,
  Highlighter,
  Minus,
  Pencil,
  Redo2,
  Square,
  Type,
  Undo2,
  X,
} from "lucide-react";

type Tool = "pen" | "highlighter" | "rect" | "ellipse" | "line" | "arrow" | "text" | "eraser";

type Point = { x: number; y: number };

type StrokeItem = {
  kind: "stroke";
  tool: "pen" | "highlighter" | "eraser";
  color: string;
  width: number;
  points: Point[];
};

type ShapeItem = {
  kind: "shape";
  tool: "rect" | "ellipse" | "line" | "arrow";
  color: string;
  width: number;
  from: Point;
  to: Point;
};

type TextItem = {
  kind: "text";
  color: string;
  size: number;
  at: Point;
  text: string;
};

type BoardItem = StrokeItem | ShapeItem | TextItem;

const COLORS = ["#e11d48", "#2563eb", "#16a34a", "#ca8a04", "#111827", "#ffffff"];

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

function paintItem(ctx: CanvasRenderingContext2D, item: BoardItem) {
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
    ctx.fillStyle = item.color;
    ctx.font = `bold ${item.size}px Assistant, Arial, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(item.text, item.at.x, item.at.y);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = item.width;
  ctx.lineCap = "round";
  const { from, to } = item;
  if (item.tool === "rect") {
    ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
  } else if (item.tool === "ellipse") {
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2;
    const rx = Math.abs(to.x - from.x) / 2;
    const ry = Math.abs(to.y - from.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
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

type Props = {
  imageDataUrl: string;
  onCancel: () => void;
  onSave: (annotatedDataUrl: string) => void;
};

export function ScreenshotWhiteboard({ imageDataUrl, onCancel, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(4);
  const [items, setItems] = useState<BoardItem[]>([]);
  const [redoStack, setRedoStack] = useState<BoardItem[]>([]);
  const [draft, setDraft] = useState<BoardItem | null>(null);
  const drawing = useRef(false);
  const [textDraft, setTextDraft] = useState<{
    at: Point;
    value: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  const naturalSize = useRef({ w: 1280, h: 720 });

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = bgRef.current;
    if (!canvas || !img) return;
    const maxW = Math.min(window.innerWidth - 24, img.naturalWidth || 1600);
    const maxH = Math.min(window.innerHeight - 120, img.naturalHeight || 900);
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

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = bgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const item of items) paintItem(ctx, item);
    if (draft) paintItem(ctx, draft);
  }, [items, draft]);

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
    const onResize = () => {
      fitCanvas();
      redraw();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitCanvas, redraw]);

  const pushItem = (item: BoardItem) => {
    setItems((prev) => [...prev, item]);
    setRedoStack([]);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(event);
    if (!point) return;
    canvasRef.current?.setPointerCapture(event.pointerId);

    if (tool === "text") {
      const rect = canvasRef.current?.getBoundingClientRect();
      setTextDraft({
        at: point,
        value: "",
        screenX: event.clientX,
        screenY: event.clientY,
      });
      void rect;
      return;
    }

    drawing.current = true;
    if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
      setDraft({
        kind: "stroke",
        tool,
        color,
        width: tool === "highlighter" ? lineWidth * 3 : tool === "eraser" ? lineWidth * 4 : lineWidth,
        points: [point],
      });
      return;
    }

    setDraft({
      kind: "shape",
      tool,
      color,
      width: lineWidth,
      from: point,
      to: point,
    });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !draft) return;
    const point = toCanvasPoint(event);
    if (!point) return;
    if (draft.kind === "stroke") {
      setDraft({ ...draft, points: [...draft.points, point] });
      return;
    }
    if (draft.kind === "shape") {
      setDraft({ ...draft, to: point });
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    try {
      canvasRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    if (draft) {
      pushItem(draft);
      setDraft(null);
    }
  };

  const commitText = () => {
    if (!textDraft) return;
    const text = textDraft.value.trim();
    if (text) {
      pushItem({
        kind: "text",
        color,
        size: Math.max(16, lineWidth * 5),
        at: textDraft.at,
        text,
      });
    }
    setTextDraft(null);
  };

  const undo = () => {
    setItems((prev) => {
      if (!prev.length) return prev;
      const next = prev.slice(0, -1);
      setRedoStack((r) => [...r, prev[prev.length - 1]]);
      return next;
    });
  };

  const redo = () => {
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const item = prev[prev.length - 1];
      setItems((itemsPrev) => [...itemsPrev, item]);
      return prev.slice(0, -1);
    });
  };

  const clearAll = () => {
    setItems([]);
    setDraft(null);
    setRedoStack([]);
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
    for (const item of items) paintItem(ctx, item);
    ctx.restore();
    onSave(out.toDataURL("image/jpeg", 0.92));
  };

  const toolBtn = (id: Tool, label: string, icon: ReactNode) => (
    <button
      key={id}
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${
        tool === id
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-border-weak bg-surface-1 text-text-primary hover:bg-surface-2"
      }`}
      onClick={() => setTool(id)}
    >
      {icon}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-slate-950/95 text-white"
      dir="rtl"
      data-dev-feedback-overlay="true"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div>
          <h2 className="text-sm font-bold sm:text-base">לוח סימון על צילום המסך</h2>
          <p className="text-xs text-white/60">
            ציירו, הוסיפו צורות וטקסט כדי להראות איך לעצב
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-xl border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
            ביטול
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500"
            onClick={exportAnnotated}
          >
            <Check className="h-4 w-4" />
            שמור סימון
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        {toolBtn("pen", "עט", <Pencil className="h-4 w-4" />)}
        {toolBtn("highlighter", "מרקר", <Highlighter className="h-4 w-4" />)}
        {toolBtn("rect", "מלבן", <Square className="h-4 w-4" />)}
        {toolBtn("ellipse", "עיגול", <Circle className="h-4 w-4" />)}
        {toolBtn("line", "קו", <Minus className="h-4 w-4" />)}
        {toolBtn("arrow", "חץ", <ArrowUpRight className="h-4 w-4" />)}
        {toolBtn("text", "טקסט", <Type className="h-4 w-4" />)}
        {toolBtn("eraser", "מחק", <Eraser className="h-4 w-4" />)}

        <div className="mx-1 h-6 w-px bg-white/15" />

        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`h-7 w-7 rounded-full border-2 ${
              color === c ? "border-white" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
            aria-label={`צבע ${c}`}
          />
        ))}

        <label className="ms-2 flex items-center gap-2 text-xs text-white/80">
          עובי
          <input
            type="range"
            min={2}
            max={16}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
          />
        </label>

        <div className="ms-auto flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 hover:bg-white/10 disabled:opacity-40"
            onClick={undo}
            disabled={!items.length}
            title="בטל"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 hover:bg-white/10 disabled:opacity-40"
            onClick={redo}
            disabled={!redoStack.length}
            title="בצע שוב"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/20 px-3 py-2 text-xs hover:bg-white/10"
            onClick={clearAll}
          >
            נקה הכל
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-3">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full touch-none rounded-lg bg-black shadow-2xl"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {textDraft ? (
          <input
            autoFocus
            className="absolute z-10 min-w-40 rounded-lg border border-white/40 bg-black/80 px-2 py-1 text-sm text-white outline-none"
            style={{
              left: Math.min(window.innerWidth - 180, Math.max(8, textDraft.screenX)),
              top: Math.min(window.innerHeight - 48, Math.max(8, textDraft.screenY)),
              color,
            }}
            value={textDraft.value}
            placeholder="הקלידו טקסט…"
            onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitText();
              }
              if (e.key === "Escape") setTextDraft(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
