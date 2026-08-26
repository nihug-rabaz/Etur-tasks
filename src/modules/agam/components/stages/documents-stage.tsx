"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ACCEPTED_FILE_TYPES, DOC_TYPES, SOURCE_LABELS, isCustomDocType } from "@/modules/agam/lib/document-types";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { fieldClass, primaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamDocument } from "@/modules/agam/types";

export function DocumentsStage({
  candidateId,
  documents,
  canEvaluate,
  onSaved,
}: {
  candidateId: string;
  documents: AgamDocument[];
  canEvaluate: boolean;
  onSaved: () => void;
}) {
  const [documentType, setDocumentType] = useState("");
  const [customType, setCustomType] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const onUpload = async () => {
    if (!file) return;
    if (!documentType) {
      toast.error("נא לבחור סוג מסמך");
      return;
    }
    if (isCustomDocType(documentType) && !customType.trim()) {
      toast.error("נא לציין סוג מסמך");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("candidateId", candidateId);
      form.set("documentType", isCustomDocType(documentType) ? customType.trim() : documentType);
      form.set("notes", notes);
      form.set("file", file);
      await agamFetch("/api/agam/documents", { method: "POST", body: form });
      setFile(null);
      setNotes("");
      setCustomType("");
      setDocumentType("");
      toast.success("המסמך הועלה");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העלאה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {canEvaluate ? (
        <div className="dashboard-glass space-y-4 rounded-3xl p-6">
          <div>
            <h2 className="text-2xl font-extrabold text-text-primary">מסמכים</h2>
            <p className="mt-1 text-sm text-text-muted">ניהול מסמכי המועמד</p>
          </div>
          <label className="block space-y-2 text-sm font-bold text-text-secondary">
            סוג מסמך
            <select
              className={fieldClass}
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              <option value="">בחרו סוג מסמך</option>
              {DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          {isCustomDocType(documentType) ? (
            <input
              className={fieldClass}
              placeholder="שם סוג מסמך מותאם"
              value={customType}
              onChange={(event) => setCustomType(event.target.value)}
            />
          ) : null}
          <input
            type="file"
            className={fieldClass}
            accept={ACCEPTED_FILE_TYPES}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <textarea
            className={fieldClass}
            placeholder="הערות"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => void onUpload()}
            disabled={!file || uploading}
          >
            {uploading ? "מעלה…" : "העלאה"}
          </button>
        </div>
      ) : (
        <div className="dashboard-glass rounded-3xl p-6">
          <h2 className="text-2xl font-extrabold text-text-primary">מסמכים</h2>
        </div>
      )}

      <div className="dashboard-glass rounded-3xl p-6">
        {documents.length === 0 ? (
          <p className="text-sm text-text-muted">אין מסמכים.</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((document) => (
              <li key={document.id} className="rounded-xl bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <a
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-accent-primary hover:underline"
                    >
                      {document.name}
                    </a>
                    <p className="text-xs text-text-muted">
                      {document.document_type} ·{" "}
                      {SOURCE_LABELS[document.upload_source ?? ""] ?? document.upload_source} ·{" "}
                      {document.uploaded_by_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-accent-primary"
                    >
                      צפייה
                    </a>
                    <a
                      href={document.file_url}
                      download={document.name}
                      className="text-xs font-bold text-text-secondary"
                    >
                      הורדה
                    </a>
                    {canEvaluate ? (
                      <button
                        type="button"
                        className="text-xs font-bold text-rose-600"
                        onClick={async () => {
                          if (!confirm("למחוק מסמך?")) return;
                          try {
                            await agamFetch(`/api/agam/documents?id=${document.id}`, {
                              method: "DELETE",
                            });
                            onSaved();
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "מחיקה נכשלה");
                          }
                        }}
                      >
                        מחיקה
                      </button>
                    ) : null}
                  </div>
                </div>
                {canEvaluate ? (
                  <textarea
                    className={`${fieldClass} mt-2`}
                    defaultValue={document.notes ?? ""}
                    placeholder="הערות"
                    onBlur={async (event) => {
                      try {
                        await agamFetch("/api/agam/documents", {
                          method: "PATCH",
                          body: JSON.stringify({ id: document.id, notes: event.target.value }),
                        });
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "שמירת הערות נכשלה");
                      }
                    }}
                  />
                ) : document.notes ? (
                  <p className="mt-2 text-sm">{document.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
