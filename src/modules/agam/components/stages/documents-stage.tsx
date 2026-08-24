"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ACCEPTED_FILE_TYPES, DOC_TYPES, SOURCE_LABELS } from "@/modules/agam/lib/document-types";
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
  const [documentType, setDocumentType] = useState(DOC_TYPES[0]);
  const [customType, setCustomType] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("candidateId", candidateId);
      form.set("documentType", customType || documentType);
      form.set("notes", notes);
      form.set("file", file);
      await agamFetch("/api/agam/documents", { method: "POST", body: form });
      setFile(null);
      setNotes("");
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
          <h2 className="text-2xl font-extrabold text-text-primary">מסמכים</h2>
          <label className="block space-y-2 text-sm font-bold text-text-secondary">
            סוג מסמך
            <select
              className={fieldClass}
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              {DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          {documentType === "אחר" ? (
            <input
              className={fieldClass}
              placeholder="סוג מותאם"
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
                  {canEvaluate ? (
                    <button
                      type="button"
                      className="text-xs font-bold text-rose-600"
                      onClick={async () => {
                        if (!confirm("למחוק מסמך?")) return;
                        await agamFetch(`/api/agam/documents?id=${document.id}`, { method: "DELETE" });
                        onSaved();
                      }}
                    >
                      מחיקה
                    </button>
                  ) : null}
                </div>
                {canEvaluate ? (
                  <textarea
                    className={`${fieldClass} mt-2`}
                    defaultValue={document.notes ?? ""}
                    placeholder="הערות"
                    onBlur={async (event) => {
                      await agamFetch("/api/agam/documents", {
                        method: "PATCH",
                        body: JSON.stringify({ id: document.id, notes: event.target.value }),
                      });
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
