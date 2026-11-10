"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { domToJpeg } from "modern-screenshot";
import {
  Camera,
  Expand,
  Loader2,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { moduleLabel } from "@/modules/dev-feedback/constants";
import { resolveActiveModuleId } from "@/shared/modules/types";
import { ScreenshotWhiteboard } from "@/components/dev-feedback/screenshot-whiteboard";

function isMostlyBlankDataUrl(dataUrl: string): boolean {
  try {
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);

  const captureViaDisplayMedia = async (): Promise<string> => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen capture API unavailable");
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
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
      if (isMostlyBlankDataUrl(dataUrl)) throw new Error("Blank display capture");
      return dataUrl;
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  };

  const captureViaDomScreenshot = async (): Promise<string> => {
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await new Promise((r) => setTimeout(r, 50));

    const dataUrl = await domToJpeg(document.documentElement, {
      quality: 0.9,
      scale: Math.min(1.5, window.devicePixelRatio || 1),
      backgroundColor: "#f4f5f7",
      width: window.innerWidth,
      height: window.innerHeight,
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
          toast.message("בחרו את הטאב הנוכחי בחלון השיתוף כדי לצלם את המסך");
          dataUrl = await captureViaDisplayMedia();
        } catch (error) {
          lastError = error;
          console.error("[dev-feedback-display-media]", error);
        }
      }

      if (!dataUrl) throw lastError ?? new Error("capture failed");

      setScreenshotDataUrl(dataUrl);
      setWhiteboardOpen(true);
      toast.success("המסך צולם — ציירו על הלוח המלא");
    } catch (error) {
      console.error(error);
      toast.error(
        "צילום המסך נכשל — לחצו «צרף תמונה» והעלו צילום ידני, או אשרו שיתוף טאב",
      );
    } finally {
      setCapturing(false);
    }
  }, []);

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return pathname;
    return window.location.href;
  }, [pathname]);

  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return res.blob();
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("description", description.trim());
      form.set("moduleId", moduleId);
      form.set("pageUrl", pageUrl);

      if (screenshotDataUrl) {
        const blob = await dataUrlToBlob(screenshotDataUrl);
        form.append(
          "screenshot",
          blob,
          blob.type.includes("png") ? "screenshot.png" : "screenshot.jpg",
        );
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
      };
      if (!res.ok) throw new Error(data.error || "שליחה נכשלה");

      toast.success(
        data.issueKey ? `נפתחה משימה ${data.issueKey} ב־Jira` : "המשימה נשלחה ל־Jira",
      );
      setTitle("");
      setDescription("");
      setScreenshotDataUrl(null);
      setExtraFiles([]);
      setWhiteboardOpen(false);
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
    <>
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center"
        data-dev-feedback-overlay="true"
        style={
          capturing || whiteboardOpen
            ? { visibility: "hidden", pointerEvents: "none" }
            : undefined
        }
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
                    className="inline-flex items-center gap-2 rounded-xl border border-border-weak px-3 py-2 text-sm font-medium"
                    onClick={() => setWhiteboardOpen(true)}
                  >
                    <Expand className="h-4 w-4" />
                    לוח מלא לציור
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-border-weak px-3 py-2 text-sm text-rose-700"
                    onClick={() => {
                      setScreenshotDataUrl(null);
                      setWhiteboardOpen(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    הסר צילום
                  </button>
                </>
              ) : null}
            </div>

            {screenshotDataUrl ? (
              <button
                type="button"
                className="block w-full overflow-hidden rounded-xl border border-border-weak bg-surface-0 text-right"
                onClick={() => setWhiteboardOpen(true)}
                title="פתחו לוח מלא לציור"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotDataUrl}
                  alt="תצוגה מקדימה של צילום המסך"
                  className="max-h-56 w-full object-contain"
                />
                <div className="border-t border-border-weak px-3 py-2 text-xs text-text-muted">
                  לחצו לפתיחת לוח מלא — ציור, צורות וטקסט
                </div>
              </button>
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
                        setWhiteboardOpen(true);
                        toast.success("התמונה נטענה — ציירו על הלוח המלא");
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
                  <li
                    key={`${file.name}-${file.size}`}
                    className="flex justify-between gap-2"
                  >
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

      {whiteboardOpen && screenshotDataUrl ? (
        <ScreenshotWhiteboard
          imageDataUrl={screenshotDataUrl}
          onCancel={() => setWhiteboardOpen(false)}
          onSave={(annotated) => {
            setScreenshotDataUrl(annotated);
            setWhiteboardOpen(false);
            toast.success("הסימון נשמר על הצילום");
          }}
        />
      ) : null}
    </>
  );
}
