"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ACCEPTED_FILE_TYPES, DOC_TYPES, isCustomDocType } from "@/modules/agam/lib/document-types";
import { fieldClass, panelClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import { AgamPublicChrome } from "@/modules/agam/components/public-chrome";

export function AgamUploadPage() {
  const [personalNumber, setPersonalNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [uploadToken, setUploadToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [documentType, setDocumentType] = useState(DOC_TYPES[0]);
  const [customType, setCustomType] = useState("");
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
    const data = (await response.json()) as { id?: string; uploadToken?: string; error?: string };
    if (!response.ok) {
      setError(data.error ?? "אימות נכשל");
      return;
    }
    setCandidateId(data.id ?? null);
    setUploadToken(data.uploadToken ?? null);
  };

  const upload = async () => {
    const resolvedType = isCustomDocType(documentType) ? customType.trim() : documentType;
    if (!candidateId || !uploadToken || !file || !resolvedType) {
      setError("נא לבחור סוג קובץ ולהעלות קובץ");
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.set("candidateId", candidateId);
    form.set("uploadToken", uploadToken);
    form.set("documentType", resolvedType);
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
      <div className={`${panelClass} w-full max-w-lg space-y-5 p-6 sm:p-8`}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            קצינים
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            העלאת מסמכים
          </h1>
        </div>

        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-text-primary">
              <CheckCircle2 size={24} />
            </div>
            <p className="mt-4 text-sm font-semibold text-text-primary">המסמך הועלה בהצלחה</p>
            <button
              type="button"
              className={`${secondaryButtonClass} mt-5`}
              onClick={() => {
                setDone(false);
                setFile(null);
              }}
            >
              העלאת מסמך נוסף
            </button>
          </div>
        ) : !candidateId ? (
          <>
            <p className="text-sm text-text-secondary">הזינו מספר אישי וטלפון לאימות זהות.</p>
            <label className="block space-y-2 text-sm font-semibold text-text-primary">
              מספר אישי
              <input
                className={`${fieldClass} text-left`}
                dir="ltr"
                value={personalNumber}
                onChange={(event) => setPersonalNumber(event.target.value)}
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-text-primary">
              טלפון
              <input
                className={`${fieldClass} text-left`}
                dir="ltr"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
            <button
              type="button"
              className={`${primaryButtonClass} w-full`}
              onClick={() => void verify()}
              disabled={loading}
            >
              {loading ? "מאמת…" : "המשך"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary">הזהות אומתה. בחרו סוג מסמך והעלו קובץ.</p>
            <label className="block space-y-2 text-sm font-semibold text-text-primary">
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
            {isCustomDocType(documentType) ? (
              <label className="block space-y-2 text-sm font-semibold text-text-primary">
                פירוט סוג
                <input
                  className={fieldClass}
                  value={customType}
                  onChange={(event) => setCustomType(event.target.value)}
                />
              </label>
            ) : null}
            <label className="block space-y-2 text-sm font-semibold text-text-primary">
              קובץ
              <input
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                className="block w-full text-sm text-text-secondary file:me-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-xs file:font-bold file:text-text-primary"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-orange px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(251,146,60,0.55)] transition hover:brightness-105 disabled:opacity-50"
              onClick={() => void upload()}
              disabled={loading || !file}
            >
              {loading ? "מעלה…" : "העלאה"}
            </button>
          </>
        )}
      </div>
    </AgamPublicChrome>
  );
}
