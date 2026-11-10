"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname } from "next/navigation";
import { domToJpeg } from "modern-screenshot";
import {
  Bug,
  Camera,
  Eraser,
  Loader2,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { moduleLabel } from "@/modules/dev-feedback/constants";
import { resolveActiveModuleId } from "@/shared/modules/types";

function isMostlyBlankDataUrl(dataUrl: string): boolean {
  try {
    // Very small JPEG/PNG payloads are almost always empty/failed captures.
    const comma = dataUrl.indexOf(",");
    const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    return b64.length < 800;
  } catch {
    return true;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function DevFeedbackPanel({ open, onClose, onSubmitted }: Props) {
  const pathname = usePathname() || "/";
  const moduleId = resolveActiveModuleId(pathname) || "tasks";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drawMode, setDrawMode] = useState(true);

  useEffect(() => {
    if (!screenshotDataUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const maxW = 720;
      const scale = Math.min(1, maxW / Math.max(img.width, 1));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.onerror = () => {
      toast.error("לא ניתן להציג את הצילום — נסו לצרף תמונה ידנית");
      setScreenshotDataUrl(null);
    };
    img.src = screenshotDataUrl;
  }, [screenshotDataUrl]);

  const captureViaDisplayMedia = async (): Promise<string> => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen capture API unavailable");
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
      // Chromium: prefer this tab so the shot matches the app page.
      preferCurrentTab: true,
      selfBrowserSurface: "include",
    } as DisplayMediaStreamOptions);
    try {
      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error("No video track");
      const video = document.createElement("video");
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      // Wait until frames are available.
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("video timeout")), 4000);
        const tick = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            window.clearTimeout(timeout);
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        tick();
      });
      await new Promise((r) => setTimeout(r, 120));
      const width = video.videoWidth || window.innerWidth;
      const height = video.videoHeight || window.innerHeight;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2d context");
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      if (isMostlyBlankDataUrl(dataUrl)) {
        throw new Error("Blank display capture");
      }
      return dataUrl;
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  };

  const captureViaDomScreenshot = async (): Promise<string> => {
    // Wait for React to hide the modal (capturing=true → visibility:hidden).
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await new Promise((r) => setTimeout(r, 50));

    const target = document.documentElement;
    const dataUrl = await domToJpeg(target, {
      quality: 0.9,
      scale: Math.min(1.5, window.devicePixelRatio || 1),
      backgroundColor: "#f4f5f7",
      width: window.innerWidth,
      height: window.innerHeight,
      // Capture the current viewport, not the full scrollable document.
      style: {
        width: `${window.innerWidth}px`,
        height: `${window.innerHeight}px`,
        overflow: "hidden",
      },
      filter: (el) => {
        if (!(el instanceof HTMLElement)) return true;
        if (el.dataset.devFeedbackOverlay === "true") return false;
        if (el.closest?.("[data-dev-feedback-overlay='true']")) return false;
        if (el.closest?.("[data-sonner-toaster]")) return false;
        return true;
      },
    });

    if (!dataUrl || isMostlyBlankDataUrl(dataUrl)) {
      throw new Error("Blank DOM screenshot");
    }
    return dataUrl;
  };

  const captureScreenshot = useCallback(async () => {
    setCapturing(true);
    try {
      let dataUrl: string | null = null;
      let lastError: unknown = null;

      try {
        dataUrl = await captureViaDomScreenshot();
      } catch (error) {
        lastError = error;
        console.warn("[dev-feedback-dom-screenshot]", error);
      }

      if (!dataUrl) {
        try {
          // Ask user to share this tab — most reliable when DOM capture fails.
          toast.message("בחרו את הטאב הנוכחי בחלון השיתוף כדי לצלם את המסך");
          dataUrl = await captureViaDisplayMedia();
        } catch (error) {
          lastError = error;
          console.error("[dev-feedback-display-media]", error);
        }
      }

      if (!dataUrl) {
        throw lastError ?? new Error("capture failed");
      }

      setScreenshotDataUrl(dataUrl);
      toast.success("המסך צולם — אפשר לסמן על התמונה");
    } catch (error) {
      console.error(error);
      toast.error(
        "צילום המסך נכשל — לחצו «צרף תמונה» והעלו צילום ידני, או אשרו שיתוף טאב כשהדפדפן מבקש",
      );
    } finally {
      setCapturing(false);
    }
  }, []);

  const pointerPos = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawMode) return;
    const point = pointerPos(event);
    if (!point) return;
    drawing.current = true;
    lastPoint.current = point;
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !drawMode) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const point = pointerPos(event);
    if (!canvas || !ctx || !point || !lastPoint.current) return;
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    lastPoint.current = null;
    try {
      canvasRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const clearMarks = () => {
    if (!screenshotDataUrl) return;
    setScreenshotDataUrl(`${screenshotDataUrl}`);
    // force redraw by cloning data URL
    const url = screenshotDataUrl;
    setScreenshotDataUrl(null);
    requestAnimationFrame(() => setScreenshotDataUrl(url));
  };

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return pathname;
    return window.location.href;
  }, [pathname]);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("description", description.trim());
      form.set("moduleId", moduleId);
      form.set("pageUrl", pageUrl);

      const canvas = canvasRef.current;
      if (canvas && screenshotDataUrl) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/png"),
        );
        if (blob) form.append("screenshot", blob, "screenshot.png");
      }

      extraFiles.forEach((file, index) => {
        form.append(`file${index}`, file, file.name);
      });

      const res = await fetch("/api/dev-feedback", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        issueKey?: string;
        browseUrl?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "שליחה נכשלה");
      }

      toast.success(
        data.issueKey ? `נפתחה משימה ${data.issueKey} ב־Jira` : "המשימה נשלחה ל־Jira",
      );
      setTitle("");
      setDescription("");
      setScreenshotDataUrl(null);
      setExtraFiles([]);
      onSubmitted?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שליחה נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center"
      data-dev-feedback-overlay="true"
      style={capturing ? { visibility: "hidden", pointerEvents: "none" } : undefined}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border-weak bg-surface-1 shadow-xl"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="דיווח משימה לפיתוח"
        data-dev-feedback-overlay="true"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border-weak bg-surface-1 px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-text-primary">משימה לפיתוח</h2>
            <p className="text-xs text-text-muted">
              מודול: {moduleLabel(moduleId)} · יישלח ל־Jira ETUR
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-text-muted hover:bg-surface-2"
            onClick={onClose}
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-text-primary">כותרת</span>
            <input
              className="w-full rounded-xl border border-border-weak bg-surface-0 px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="מה צריך לתקן / לפתח?"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-text-primary">תיאור</span>
            <textarea
              className="min-h-28 w-full rounded-xl border border-border-weak bg-surface-0 px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="פרטו מה רוצים, איפה זה קורה, ומה התוצאה הרצויה…"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              onClick={() => void captureScreenshot()}
              disabled={capturing}
            >
              {capturing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              צלם מסך
            </button>
            {screenshotDataUrl ? (
              <>
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                    drawMode
                      ? "border-rose-500 bg-rose-500/10 text-rose-700"
                      : "border-border-weak"
                  }`}
                  onClick={() => setDrawMode((v) => !v)}
                >
                  <Bug className="h-4 w-4" />
                  {drawMode ? "מצב סימון פעיל" : "הפעל סימון"}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border-weak px-3 py-2 text-sm"
                  onClick={clearMarks}
                >
                  <Eraser className="h-4 w-4" />
                  נקה סימונים
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border-weak px-3 py-2 text-sm text-rose-700"
                  onClick={() => setScreenshotDataUrl(null)}
                >
                  <Trash2 className="h-4 w-4" />
                  הסר צילום
                </button>
              </>
            ) : null}
          </div>

          {screenshotDataUrl ? (
            <div className="overflow-hidden rounded-xl border border-border-weak bg-surface-0">
              <canvas
                ref={canvasRef}
                className="max-h-72 w-full touch-none bg-black/5"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            </div>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border-weak px-3 py-3 text-sm text-text-muted hover:bg-surface-2">
            <Paperclip className="h-4 w-4" />
            <span>
              צרף תמונה / קבצים
              {extraFiles.length ? ` (${extraFiles.length})` : ""}
            </span>
            <input
              type="file"
              className="hidden"
              multiple
              accept="image/*,.pdf,.xlsx,.xls,.doc,.docx,.txt"
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                const firstImage = list.find((f) => f.type.startsWith("image/"));
                if (firstImage && !screenshotDataUrl) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") {
                      setScreenshotDataUrl(reader.result);
                      toast.success("התמונה נטענה לסימון");
                    }
                  };
                  reader.readAsDataURL(firstImage);
                  setExtraFiles((prev) =>
                    [...prev, ...list.filter((f) => f !== firstImage)].slice(0, 5),
                  );
                } else {
                  setExtraFiles((prev) => [...prev, ...list].slice(0, 5));
                }
                e.target.value = "";
              }}
            />
          </label>
          {extraFiles.length ? (
            <ul className="space-y-1 text-xs text-text-muted">
              {extraFiles.map((file) => (
                <li key={`${file.name}-${file.size}`} className="flex justify-between gap-2">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    className="text-rose-600"
                    onClick={() =>
                      setExtraFiles((prev) => prev.filter((f) => f !== file))
                    }
                  >
                    הסר
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-xl border border-border-weak px-4 py-2 text-sm"
              onClick={onClose}
              disabled={submitting}
            >
              ביטול
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => void submit()}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              שלח ל־Jira
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
