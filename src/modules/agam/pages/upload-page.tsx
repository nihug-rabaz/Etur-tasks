"use client";

import { useState } from "react";
import { ACCEPTED_FILE_TYPES, DOC_TYPES } from "@/modules/agam/lib/document-types";
import { fieldClass, primaryButtonClass } from "@/modules/agam/lib/ui";
import { AgamPublicChrome } from "@/modules/agam/components/public-chrome";

export function AgamUploadPage() {
  const [personalNumber, setPersonalNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [documentType, setDocumentType] = useState(DOC_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/agam/public/upload/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalNumber, phone }),
    });
    setLoading(false);
    const data = (await response.json()) as { id?: string; error?: string };
    if (!response.ok) {
      setError(data.error ?? "אימות נכשל");
      return;
    }
    setCandidateId(data.id ?? null);
  };

  const upload = async () => {
    if (!candidateId || !file || !documentType) {
      setError("נא לבחור סוג קובץ ולהעלות קובץ");
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.set("candidateId", candidateId);
    form.set("documentType", documentType);
    form.set("file", file);
    const response = await fetch("/api/agam/public/upload", { method: "POST", body: form });
    setLoading(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "העלאה נכשלה");
      return;
    }
    setDone(true);
  };

  return (
    <AgamPublicChrome>
      <div className="dashboard-glass w-full max-w-md space-y-4 rounded-3xl p-8">
        <h1 className="text-3xl font-extrabold text-text-primary">העלאת מסמכים</h1>
        {done ? (
          <p className="text-sm text-emerald-700">המסמך הועלה בהצלחה.</p>
        ) : !candidateId ? (
          <>
            <p className="text-sm text-text-secondary">הזינו מספר אישי וטלפון לאימות זהות.</p>
            <label className="block space-y-2 text-sm font-bold text-text-secondary">
              מספר אישי
              <input
                className={`${fieldClass} text-left`}
                dir="ltr"
                value={personalNumber}
                onChange={(event) => setPersonalNumber(event.target.value)}
              />
            </label>
            <label className="block space-y-2 text-sm font-bold text-text-secondary">
              טלפון
              <input
                className={`${fieldClass} text-left`}
                dir="ltr"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <button type="button" className={`${primaryButtonClass} w-full`} onClick={() => void verify()} disabled={loading}>
              {loading ? "מאמת…" : "אימות"}
            </button>
          </>
        ) : (
          <>
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
            <input
              type="file"
              className={fieldClass}
              accept={ACCEPTED_FILE_TYPES}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={`${primaryButtonClass} w-full`}
              onClick={() => void upload()}
              disabled={loading || !file}
            >
              {loading ? "מעלה…" : "העלאה"}
            </button>
          </>
        )}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </AgamPublicChrome>
  );
}
