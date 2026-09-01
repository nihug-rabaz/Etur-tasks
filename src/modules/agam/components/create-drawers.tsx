"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { ACCEPTED_FILE_TYPES, DOC_TYPES, isCustomDocType } from "@/modules/agam/lib/document-types";
import { fieldClass, primaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCandidate } from "@/modules/agam/types";

function CandidatePicker({
  value,
  onChange,
  enabled,
}: {
  value: string;
  onChange: (id: string) => void;
  enabled: boolean;
}) {
  const [candidates, setCandidates] = useState<AgamCandidate[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!enabled) return;
    void agamFetch<{ candidates: AgamCandidate[] }>("/api/agam/candidates")
      .then((data) => setCandidates(data.candidates))
      .catch(() => toast.error("טעינת המועמדים נכשלה"));
  }, [enabled]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter(
      (row) =>
        !q ||
        row.full_name.toLowerCase().includes(q) ||
        row.personal_number.toLowerCase().includes(q),
    );
  }, [candidates, query]);

  return (
    <div className="space-y-2">
      <input
        className={fieldClass}
        placeholder="חיפוש מועמד"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="ui-card max-h-56 overflow-y-auto rounded-xl bg-surface-2/80">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-text-muted">לא נמצאו מועמדים.</p>
        ) : (
          filtered.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`flex w-full items-center justify-between px-3 py-2.5 text-start text-sm ${
                value === row.id ? "bg-accent-primary/12 font-bold text-accent-primary" : "text-text-primary"
              }`}
              onClick={() => onChange(row.id)}
            >
              <span>{row.full_name}</span>
              <span className="text-xs text-text-muted" dir="ltr">
                {row.personal_number}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function CreateCandidateDrawer({
  hideTrigger = false,
  open: openProp,
  onOpenChange,
  onCreated,
  cycleId = null,
  stayOnSuccess = false,
}: {
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (id: string) => void;
  cycleId?: string | null;
  stayOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [fullName, setFullName] = useState("");
  const [personalNumber, setPersonalNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [command, setCommand] = useState("");
  const [directCommanderName, setDirectCommanderName] = useState("");
  const [gaps, setGaps] = useState("");
  const [planningIndex, setPlanningIndex] = useState("");
  const [dapar, setDapar] = useState("");
  const [needsSakmar, setNeedsSakmar] = useState("");
  const [mabdakApproval, setMabdakApproval] = useState("");
  const [medicalIssue, setMedicalIssue] = useState("");
  const isExceptional =
    (planningIndex === "1" || planningIndex === "2") &&
    dapar !== "" &&
    Number(dapar) < 30;
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const data = await agamFetch<{ candidate: AgamCandidate }>("/api/agam/candidates", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          personalNumber,
          phone: phone || null,
          cycleId: cycleId || null,
          command: command || null,
          directCommanderName: directCommanderName || null,
          gaps: gaps || null,
          planningIndex: planningIndex ? Number(planningIndex) : null,
          dapar: dapar ? Number(dapar) : null,
          needsSakmar: needsSakmar ? needsSakmar === "yes" : null,
          mabdakApproval: mabdakApproval ? mabdakApproval === "yes" : null,
          medicalIssue: medicalIssue ? medicalIssue === "yes" : null,
        }),
      });
      toast.success("המועמד נוצר");
      setOpen(false);
      setFullName("");
      setPersonalNumber("");
      setPhone("");
      setCommand("");
      setDirectCommanderName("");
      setGaps("");
      setPlanningIndex("");
      setDapar("");
      setNeedsSakmar("");
      setMabdakApproval("");
      setMedicalIssue("");
      onCreated?.(data.candidate.id);
      if (!stayOnSuccess) {
        router.push(`/agam/candidates/${data.candidate.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "יצירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          dir="rtl"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(2,132,199,0.55)] transition hover:brightness-105"
          onClick={() => setOpen(true)}
        >
          מועמד חדש
          <Plus size={16} />
        </button>
      )}
      <Drawer open={open} onClose={() => setOpen(false)} title="מועמד חדש" subtitle="יצירת תיק על ידי הצוות">
        <div className="space-y-4 p-1">
          <label className="block space-y-2 text-sm font-bold text-text-secondary">
            שם מלא
            <input className={fieldClass} value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-bold text-text-secondary">
              פיקוד
              <input className={fieldClass} value={command} onChange={(event) => setCommand(event.target.value)} />
            </label>
            <label className="block space-y-2 text-sm font-bold text-text-secondary">
              שם המפקד הישיר
              <input
                className={fieldClass}
                value={directCommanderName}
                onChange={(event) => setDirectCommanderName(event.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-2 text-sm font-bold text-text-secondary">
            פערים
            <textarea
              className={fieldClass}
              rows={3}
              value={gaps}
              onChange={(event) => setGaps(event.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-bold text-text-secondary">
              מדד תכנוני
              <input
                type="number"
                className={`${fieldClass} text-left`}
                dir="ltr"
                value={planningIndex}
                onChange={(event) => setPlanningIndex(event.target.value)}
              />
            </label>
            <label className="block space-y-2 text-sm font-bold text-text-secondary">
              דפ״ר
              <input
                type="number"
                className={`${fieldClass} text-left`}
                dir="ltr"
                value={dapar}
                onChange={(event) => setDapar(event.target.value)}
              />
            </label>
          </div>
          {isExceptional ? (
            <div className="flex items-start gap-2 rounded-2xl bg-rose-500/12 p-3 text-sm font-bold text-rose-700">
              <AlertTriangle size={18} />
              חייל חריג: מדד תכנוני {planningIndex} ודפ״ר מתחת ל-30
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["needsSakmar", "צריך סכמר", needsSakmar, setNeedsSakmar],
              ["mabdakApproval", "אישור למבדק", mabdakApproval, setMabdakApproval],
              ["medicalIssue", "בעיה רפואית", medicalIssue, setMedicalIssue],
            ].map(([key, label, value, setter]) => (
              <label key={String(key)} className="block space-y-2 text-sm font-bold text-text-secondary">
                {String(label)}
                <select
                  className={fieldClass}
                  value={String(value)}
                  onChange={(event) => (setter as (next: string) => void)(event.target.value)}
                >
                  <option value="">לא סומן</option>
                  <option value="yes">כן</option>
                  <option value="no">לא</option>
                </select>
              </label>
            ))}
          </div>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={saving || fullName.trim().length < 2 || personalNumber.trim().length < 2}
            onClick={() => void submit()}
          >
            {saving ? "יוצר…" : "יצירת תיק"}
          </button>
        </div>
      </Drawer>
    </>
  );
}

export function CreateInterviewDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState("");
  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title="ראיון חדש" subtitle="בחרו מועמד לטופס הראיון">
      <div className="space-y-4 p-1">
        <CandidatePicker enabled={open} value={candidateId} onChange={setCandidateId} />
        <button
          type="button"
          className={primaryButtonClass}
          disabled={!candidateId}
          onClick={() => {
            onOpenChange(false);
            router.push(`/agam/candidates/${candidateId}/interview`);
          }}
        >
          המשך לטופס
        </button>
      </div>
    </Drawer>
  );
}

export function CreateEvaluationDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState("");
  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title="הערכה חדשה" subtitle="הערכת יום מיונים לפי קריטריונים">
      <div className="space-y-4 p-1">
        <CandidatePicker enabled={open} value={candidateId} onChange={setCandidateId} />
        <button
          type="button"
          className={primaryButtonClass}
          disabled={!candidateId}
          onClick={() => {
            onOpenChange(false);
            router.push(`/agam/candidates/${candidateId}/evaluation`);
          }}
        >
          המשך לטופס
        </button>
      </div>
    </Drawer>
  );
}

export function CreateDocumentDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState("");
  const [documentType, setDocumentType] = useState(DOC_TYPES[0]);
  const [customType, setCustomType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = async () => {
    if (!candidateId || !file) return;
    if (isCustomDocType(documentType) && !customType.trim()) {
      toast.error("נא לציין סוג מסמך");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("candidateId", candidateId);
      form.set("documentType", isCustomDocType(documentType) ? customType.trim() : documentType);
      form.set("file", file);
      await agamFetch("/api/agam/documents", { method: "POST", body: form });
      toast.success("המסמך הועלה");
      onOpenChange(false);
      setFile(null);
      setCustomType("");
      router.push(`/agam/candidates/${candidateId}?stage=documents`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העלאה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title="העלאת מסמך" subtitle="קורות חיים, ת״ז, אישור רפואי ועוד">
      <div className="space-y-4 p-1">
        <CandidatePicker enabled={open} value={candidateId} onChange={setCandidateId} />
        <label className="block space-y-2 text-sm font-bold text-text-secondary">
          סוג מסמך
          <select className={fieldClass} value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
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
        <button
          type="button"
          className={primaryButtonClass}
          disabled={!candidateId || !file || uploading}
          onClick={() => void submit()}
        >
          {uploading ? "מעלה…" : "העלאה"}
        </button>
      </div>
    </Drawer>
  );
}
