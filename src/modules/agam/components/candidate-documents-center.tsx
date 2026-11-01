"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  Check,
  Download,
  Eye,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import {
  ACCEPTED_FILE_TYPES,
  MAX_UPLOAD_BYTES_WITHOUT_BLOB,
  SOURCE_LABELS,
  documentMatchesType,
  formatFileSize,
  isSportsResultsDocument,
  requiredDocuments,
  type RequiredDocument,
} from "@/modules/agam/lib/document-types";
import { documentDownloadHref } from "@/modules/agam/lib/document-download";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import type { AgamCandidate, AgamDocument } from "@/modules/agam/types";

const ALLOWED_EXTENSIONS = ACCEPTED_FILE_TYPES.split(",").map((ext) => ext.trim().toLowerCase());

function fileExtension(name: string): string {
  return name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "";
}

function FileTypeIcon({ name, size = 18 }: { name: string; size?: number }) {
  const ext = fileExtension(name);
  if (["jpg", "jpeg", "png"].includes(ext)) return <FileImage size={size} />;
  if (["xls", "xlsx"].includes(ext)) return <FileSpreadsheet size={size} />;
  if (["pdf", "doc", "docx"].includes(ext)) return <FileText size={size} />;
  return <FileIcon size={size} />;
}

function validateClientFile(file: File): string | null {
  if (!ALLOWED_EXTENSIONS.includes(`.${fileExtension(file.name)}`)) {
    return "סוג קובץ לא נתמך — PDF, Word, Excel או תמונה";
  }
  if (file.size > MAX_UPLOAD_BYTES_WITHOUT_BLOB) {
    return `הקובץ גדול מדי (${formatFileSize(file.size)}) — עד 4MB`;
  }
  return null;
}

function documentMeta(document: AgamDocument): string {
  return [
    SOURCE_LABELS[document.upload_source ?? ""] ?? document.upload_source,
    formatAgamDate(document.created_at),
    formatFileSize(document.file_size),
  ]
    .filter(Boolean)
    .join(" · ");
}

const iconButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-2 hover:text-text-primary";

export function CandidateDocumentsCenter({
  open,
  onClose,
  candidate,
  documents,
  canEvaluate,
  canApprove,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  candidate: AgamCandidate;
  documents: AgamDocument[];
  canEvaluate: boolean;
  canApprove: boolean;
  onSaved: () => void;
}) {
  const required = requiredDocuments(candidate);
  const paperwork = documents.filter((document) => !isSportsResultsDocument(document));
  const matched = required.map((doc) => ({
    doc,
    file: paperwork.find((document) => documentMatchesType(document, doc.type)) ?? null,
  }));
  const matchedIds = new Set(matched.map((row) => row.file?.id).filter(Boolean));
  const others = paperwork.filter((document) => !matchedIds.has(document.id));
  const uploaded = matched.filter((row) => row.file).length;
  const approved = matched.filter((row) => row.file?.approved_at).length;
  const awaitingApproval = uploaded - approved;
  const complete = approved === required.length;

  const missing = required.length - uploaded;
  const needsApprovalOnly = missing === 0 && awaitingApproval > 0;
  const [fileDragActive, setFileDragActive] = useState(false);
  const dragDepth = useRef(0);

  const dragHandlers = canEvaluate
    ? {
        onDragEnter: (event: DragEvent<HTMLDivElement>) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          dragDepth.current += 1;
          setFileDragActive(true);
        },
        onDragLeave: () => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setFileDragActive(false);
        },
        onDragOver: (event: DragEvent<HTMLDivElement>) => event.preventDefault(),
        onDrop: (event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          dragDepth.current = 0;
          setFileDragActive(false);
        },
      }
    : {};

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="מרכז מסמכים"
      subtitle={candidate.full_name}
      icon={
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
          <FolderOpen size={19} />
        </span>
      }
    >
      <div className="space-y-5" {...dragHandlers}>
        <div
          className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 ${
            complete
              ? "bg-emerald-500/[0.08] text-emerald-900 dark:text-emerald-100"
              : needsApprovalOnly
                ? "bg-sky-500/[0.08] text-text-primary"
                : "bg-accent-primary/[0.08] text-text-primary"
          }`}
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${
              complete ? "bg-emerald-500" : needsApprovalOnly ? "bg-sky-500" : "bg-accent-primary"
            }`}
          >
            {complete ? (
              <Check size={20} strokeWidth={3} />
            ) : needsApprovalOnly ? (
              <ShieldCheck size={19} />
            ) : (
              <Upload size={19} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold">
              {complete
                ? "כל המסמכים הנדרשים אושרו"
                : missing > 0
                  ? missing === 1
                    ? "נדרשת פעולה: העלאת מסמך אחד"
                    : `נדרשת פעולה: העלאת ${missing} מסמכים`
                  : canApprove
                    ? awaitingApproval === 1
                      ? "נדרש אישור: מסמך אחד ממתין לאישורך"
                      : `נדרש אישור: ${awaitingApproval} מסמכים ממתינים לאישורך`
                    : "כל המסמכים הועלו · ממתין לאישור מנהל"}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {complete
                ? "התיק מלא ומאושר. החלפת קובץ תדרוש אישור מחדש."
                : missing > 0
                  ? "גררו כל קובץ אל השורה המתאימה בטבלה, או לחצו על «בחירת קובץ»"
                  : canApprove
                    ? "צפו בכל קובץ ולחצו «אישור» כשהוא תקין"
                    : "המנהל יעבור על הקבצים ויאשר אותם"}
            </p>
          </div>
          <span className="shrink-0 text-xl font-extrabold tabular-nums" title="מסמכים מאושרים">
            {approved}
            <span className="text-sm font-bold text-text-muted">/{required.length}</span>
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_rgba(22,24,29,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
          <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1.7fr)] gap-3 bg-surface-2/70 px-4 py-2 text-[11px] font-extrabold text-text-muted sm:grid">
            <span>מסמך</span>
            <span>סטטוס</span>
            <span>קובץ</span>
          </div>
          <ul>
            {matched.map(({ doc, file }) => (
              <RequiredDocumentRow
                key={doc.key}
                doc={doc}
                file={file}
                candidateId={candidate.id}
                canEvaluate={canEvaluate}
                canApprove={canApprove}
                fileDragActive={fileDragActive}
                onSaved={onSaved}
              />
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-text-muted">
          כולל חוו״ד 870, סימול מזון, תדפיס ת״ש, טפסים 1004/102 ומסמכים רפואיים · סכמ״ר לפי מדד תכנוני · PDF/Word/Excel/תמונה · עד 4MB
        </p>

        {others.length > 0 ? (
          <section>
            <h3 className="mb-2 text-xs font-extrabold text-text-muted">מסמכים נוספים בתיק</h3>
            <ul className="space-y-1.5">
              {others.map((document) => (
                <li key={document.id} className="flex items-center gap-3 rounded-2xl bg-surface-2/60 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-1 text-text-secondary">
                    <FileTypeIcon name={document.name} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-text-primary">{document.name}</p>
                    <p className="truncate text-[11px] text-text-muted">
                      {[document.document_type, documentMeta(document)].filter(Boolean).join(" · ")}
                    </p>
                    {document.approved_at ? (
                      <p className="mt-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        אושר{document.approved_by_name ? ` ע״י ${document.approved_by_name}` : ""}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[10px] font-bold text-sky-800 dark:text-sky-200">ממתין לאישור</p>
                    )}
                  </div>
                  {canApprove && !document.approved_at ? (
                    <ApproveExtraButton document={document} onSaved={onSaved} />
                  ) : null}
                  <DocumentActions document={document} canDelete={canEvaluate} onSaved={onSaved} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}

function RequiredDocumentRow({
  doc,
  file,
  candidateId,
  canEvaluate,
  canApprove,
  fileDragActive,
  onSaved,
}: {
  doc: RequiredDocument;
  file: AgamDocument | null;
  candidateId: string;
  canEvaluate: boolean;
  canApprove: boolean;
  fileDragActive: boolean;
  onSaved: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [over, setOver] = useState(false);
  const [approving, setApproving] = useState(false);

  const setApproval = async (next: boolean) => {
    if (!file) return;
    setApproving(true);
    try {
      await agamFetch("/api/agam/documents", {
        method: "PATCH",
        body: JSON.stringify({ id: file.id, approved: next }),
      });
      toast.success(next ? `${doc.type} אושר` : "האישור בוטל");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העדכון נכשל");
    } finally {
      setApproving(false);
    }
  };

  const upload = async (next: File | null) => {
    if (!next) return;
    const error = validateClientFile(next);
    if (error) {
      toast.error(error);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("candidateId", candidateId);
      form.set("documentType", doc.type);
      form.set("notes", "");
      form.set("file", next);
      await agamFetch("/api/agam/documents", { method: "POST", body: form });
      if (file) {
        await agamFetch(`/api/agam/documents?id=${file.id}`, { method: "DELETE" }).catch(() => undefined);
      }
      toast.success(file ? `${doc.type} הוחלף` : `${doc.type} הועלה`);
      onSaved();
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "העלאה נכשלה");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const dropHandlers = canEvaluate
    ? {
        onDragOver: (event: DragEvent<HTMLElement>) => {
          event.preventDefault();
          setOver(true);
        },
        onDragLeave: () => setOver(false),
        onDrop: (event: DragEvent<HTMLElement>) => {
          event.preventDefault();
          setOver(false);
          void upload(event.dataTransfer.files?.[0] ?? null);
        },
      }
    : {};

  const slotTone = over
    ? "border-accent-primary bg-accent-primary/[0.1] text-accent-primary"
    : fileDragActive
      ? "border-accent-primary/50 bg-accent-primary/[0.04] text-accent-primary animate-pulse"
      : "border-black/12 bg-surface-2/40 text-text-secondary dark:border-white/15";

  return (
    <li
      {...dropHandlers}
      className={`grid gap-3 px-4 py-3.5 transition sm:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1.7fr)] sm:items-center [&:not(:first-child)]:shadow-[inset_0_1px_0_rgba(22,24,29,0.06)] dark:[&:not(:first-child)]:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
        over ? "bg-accent-primary/[0.04]" : ""
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_FILE_TYPES}
        onChange={(event) => void upload(event.target.files?.[0] ?? null)}
      />

      <div className="min-w-0">
        <p className="text-sm font-extrabold text-text-primary">{doc.type}</p>
        <p className="mt-0.5 text-[11px] text-text-muted">{doc.reason}</p>
      </div>

      <div>
        {file?.approved_at ? (
          <div className="flex flex-col items-start gap-0.5">
            <span
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300"
              title={[file.approved_by_name, formatAgamDate(file.approved_at)].filter(Boolean).join(" · ")}
            >
              <ShieldCheck size={12} />
              אושר
            </span>
            {canApprove ? (
              <button
                type="button"
                disabled={approving}
                onClick={() => void setApproval(false)}
                className="px-1 text-[10px] font-bold text-text-muted transition hover:text-rose-600"
              >
                ביטול אישור
              </button>
            ) : null}
          </div>
        ) : file ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/12 px-2.5 py-1 text-[11px] font-extrabold text-sky-800 dark:text-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            ממתין לאישור
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2.5 py-1 text-[11px] font-extrabold text-amber-800 dark:text-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            חסר
          </span>
        )}
      </div>

      <div className="min-w-0">
        {uploading ? (
          <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent-primary/[0.06] text-xs font-bold text-accent-primary">
            <Loader2 size={15} className="animate-spin" />
            מעלה…
          </div>
        ) : file ? (
          <div
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition ${
              over ? "bg-accent-primary/[0.1] shadow-[inset_0_0_0_2px_rgba(99,102,241,0.5)]" : "bg-surface-2/60"
            }`}
          >
            <span className="shrink-0 text-text-secondary">
              <FileTypeIcon name={file.name} size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <a
                href={documentDownloadHref(file.id)}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-xs font-bold text-text-primary hover:underline"
              >
                {over ? "שחררו להחלפת הקובץ" : file.name}
              </a>
              <p className="truncate text-[10px] text-text-muted">
                {file.approved_at && file.approved_by_name
                  ? `אושר ע״י ${file.approved_by_name} · ${formatAgamDate(file.approved_at)}`
                  : documentMeta(file)}
              </p>
            </div>
            {canApprove && !file.approved_at ? (
              <button
                type="button"
                disabled={approving}
                onClick={() => void setApproval(true)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-700 disabled:opacity-60"
              >
                {approving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
                אישור
              </button>
            ) : null}
            {canEvaluate ? (
              <button
                type="button"
                className={iconButtonClass}
                onClick={() => inputRef.current?.click()}
                title="החלפת קובץ"
                aria-label="החלפת קובץ"
              >
                <RefreshCw size={14} />
              </button>
            ) : null}
            <DocumentActions document={file} canDelete={canEvaluate} onSaved={onSaved} />
          </div>
        ) : canEvaluate ? (
          <div
            className={`flex h-12 items-center gap-2 rounded-xl border-2 border-dashed px-3 transition ${slotTone}`}
          >
            <Upload size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-xs font-bold">
              {over ? "שחררו כאן להעלאה" : "גררו קובץ לכאן"}
            </span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="shrink-0 rounded-lg bg-accent-primary px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:-translate-y-px"
            >
              בחירת קובץ
            </button>
          </div>
        ) : (
          <p className="text-xs text-text-muted">לא הועלה</p>
        )}
      </div>
    </li>
  );
}

function ApproveExtraButton({ document, onSaved }: { document: AgamDocument; onSaved: () => void }) {
  const [approving, setApproving] = useState(false);
  return (
    <button
      type="button"
      disabled={approving}
      onClick={() => {
        void (async () => {
          setApproving(true);
          try {
            await agamFetch("/api/agam/documents", {
              method: "PATCH",
              body: JSON.stringify({ id: document.id, approved: true }),
            });
            toast.success("המסמך אושר");
            onSaved();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "העדכון נכשל");
          } finally {
            setApproving(false);
          }
        })();
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
    >
      {approving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
      אישור
    </button>
  );
}

function DocumentActions({
  document,
  canDelete,
  onSaved,
}: {
  document: AgamDocument;
  canDelete: boolean;
  onSaved: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const remove = async () => {
    try {
      await agamFetch(`/api/agam/documents?id=${document.id}`, { method: "DELETE" });
      toast.success("המסמך נמחק");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "מחיקה נכשלה");
    } finally {
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-bold text-white"
          onClick={() => void remove()}
        >
          מחיקה
        </button>
        <button
          type="button"
          className="rounded-lg px-2 py-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
          onClick={() => setConfirming(false)}
        >
          ביטול
        </button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center">
      <a
        href={documentDownloadHref(document.id)}
        target="_blank"
        rel="noreferrer"
        className={iconButtonClass}
        title="צפייה"
        aria-label="צפייה"
      >
        <Eye size={16} />
      </a>
      <a href={documentDownloadHref(document.id, true)} className={iconButtonClass} title="הורדה" aria-label="הורדה">
        <Download size={16} />
      </a>
      {canDelete ? (
        <button
          type="button"
          className={`${iconButtonClass} hover:bg-rose-500/10 hover:text-rose-600`}
          onClick={() => setConfirming(true)}
          title="מחיקה"
          aria-label="מחיקה"
        >
          <Trash2 size={15} />
        </button>
      ) : null}
    </div>
  );
}
