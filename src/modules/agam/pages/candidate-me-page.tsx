"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  Check,
  ClipboardList,
  FileUp,
  GraduationCap,
  Info,
  Loader2,
  Route,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  CaseSectionHead,
  caseCardClass,
  type CaseTone,
} from "@/modules/agam/components/case-file-kit";
import { Modal } from "@/components/ui/modal";
import { EXAM_GROUPS, ExamsBoard, type ExamGroup } from "@/modules/agam/components/test-results-cards";
import { THRESHOLD_TESTS } from "@/modules/agam/lib/stages";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import {
  ACCEPTED_FILE_TYPES,
  MAX_UPLOAD_BYTES_WITHOUT_BLOB,
  SPORTS_RESULTS_DOC_TYPE,
  formatFileSize,
} from "@/modules/agam/lib/document-types";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { CandidateMePayload } from "@/modules/agam/services/candidate-me.service";

const SPORTS_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const DOCS_GUIDE_IMAGE = "/docs/required-documents-guide.png";
const DOCS_GUIDE_PDF = "/docs/required-documents-guide.pdf";

type IconType = ComponentType<{ size?: number; className?: string }>;

function PassPill({ value }: { value: boolean | null | undefined }) {
  if (value == null) {
    return <span className="text-[11px] font-semibold text-text-muted">טרם נקבע</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
        value
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
          : "bg-rose-500/15 text-rose-700 dark:text-rose-200"
      }`}
    >
      {value ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
      {value ? "עבר" : "לא עבר"}
    </span>
  );
}

function ScoreValue({ value }: { value: number | string | null | undefined }) {
  if (value == null || value === "") return <span className="text-text-muted">—</span>;
  return (
    <span className="font-extrabold tabular-nums text-text-primary" dir="ltr">
      {value}
    </span>
  );
}

function FieldChip({
  label,
  value,
  wide = false,
  ltr = false,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
  ltr?: boolean;
}) {
  return (
    <div className={`rounded-2xl bg-surface-2/80 px-3 py-2.5 ${wide ? "col-span-full" : ""}`}>
      <p className="text-[11px] font-semibold text-text-muted">{label}</p>
      <p className="mt-0.5 break-words text-[14px] font-extrabold text-text-primary" dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </p>
    </div>
  );
}

function FileAccordion({
  icon,
  title,
  tone,
  badge,
  defaultOpen = false,
  children,
}: {
  icon: IconType;
  title: string;
  tone: CaseTone;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={caseCardClass}>
      <CaseSectionHead
        icon={icon}
        title={title}
        tone={tone}
        open={open}
        onToggle={() => setOpen((current) => !current)}
        action={badge}
      />
      {open ? <div className="px-3.5 py-3.5 sm:px-4">{children}</div> : null}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="py-2 text-center text-sm font-semibold text-text-muted">{text}</p>;
}

export function AgamCandidateMePage() {
  const [payload, setPayload] = useState<CandidateMePayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [extraType, setExtraType] = useState("מסמך אחר");
  const [docsGuideOpen, setDocsGuideOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sportsInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await agamFetch<CandidateMePayload>("/api/agam/me");
      setPayload(data);
    } catch (loadError) {
      setPayload(null);
      setError(loadError instanceof Error ? loadError.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (documentType: string, file: File, successMessage = "המסמך הועלה") => {
    if (file.size > MAX_UPLOAD_BYTES_WITHOUT_BLOB) {
      toast.error(`הקובץ גדול מדי (${formatFileSize(file.size)}) — עד 4MB`);
      return;
    }
    if (documentType === SPORTS_RESULTS_DOC_TYPE) {
      const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "";
      if (!["jpg", "jpeg", "png", "webp"].includes(ext ?? "") && !file.type.startsWith("image/")) {
        toast.error("יש להעלות תמונה בלבד (JPG / PNG)");
        return;
      }
    }
    setUploadingKey(documentType);
    try {
      const form = new FormData();
      form.set("documentType", documentType);
      form.set("file", file);
      const response = await fetch("/api/agam/me/documents", { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        documents?: CandidateMePayload["documents"];
      };
      if (!response.ok) {
        const fallback =
          response.status === 403
            ? "אין הרשאה להעלאה — התחברו עם המייל מהשאלון"
            : response.status === 413
              ? "הקובץ גדול מדי — עד 4MB"
              : "העלאה נכשלה";
        throw new Error(data.error || fallback);
      }
      await load();
      toast.success(successMessage);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "העלאה נכשלה");
    } finally {
      setUploadingKey(null);
    }
  };

  const pickFile = (documentType: string) => {
    pendingTypeRef.current = documentType;
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-text-muted">
        <Loader2 size={16} className="animate-spin" />
        טוען את התיק האישי…
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className={`${caseCardClass} px-5 py-8 text-center`}>
        <h1 className="text-xl font-extrabold text-text-primary">אין תיק מקושר</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {error || "לא נמצא תיק מועמד לחשבון זה. התחברו עם אותו מייל Google שנרשמתם בשאלון המקדים."}
        </p>
        <button type="button" className={`${secondaryButtonClass} mt-5`} onClick={() => void load()}>
          נסו שוב
        </button>
      </div>
    );
  }

  const { candidate, stages, personalDetails, scores, sportsResults, documents } = payload;
  const requiredDone = documents.required.filter((row) => row.uploaded).length;
  const hasScoreDetails =
    scores.dayEvaluations.length > 0 ||
    scores.prepDays.length > 0 ||
    scores.smach.length > 0 ||
    scores.interviews.some((row) => row.completed || row.recommendation);
  const testsByKey = new Map(scores.tests.map((test) => [test.key, test]));
  const examGroups: ExamGroup[] = EXAM_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    icon: group.icon,
    columns: group.columns.map((column) => ({
      label: column.label,
      cells: THRESHOLD_TESTS.filter((test) => test.family === column.family).map((test) => ({
        key: test.key,
        inputType: test.inputType,
        value: testsByKey.get(test.key)?.value ?? null,
        pass: testsByKey.get(test.key)?.pass ?? null,
      })),
    })),
  }));
  const sportsUploading = uploadingKey === SPORTS_RESULTS_DOC_TYPE;

  return (
    <div className="flex w-full flex-col gap-3 pb-6 sm:gap-3.5">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || !pendingTypeRef.current) return;
          void upload(pendingTypeRef.current, file);
        }}
      />
      <input
        ref={sportsInputRef}
        type="file"
        accept={SPORTS_IMAGE_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void upload(SPORTS_RESULTS_DOC_TYPE, file, "תמונת תוצאות הספורט הועלתה");
        }}
      />

      <section className={`${caseCardClass} px-4 py-4 sm:px-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-[1.35rem] font-extrabold leading-tight tracking-tight text-text-primary sm:text-2xl">
              {candidate.full_name}
            </h1>
            <p className="mt-1 text-sm font-semibold text-text-secondary">
              {[candidate.cycle_name, candidate.personal_number].filter(Boolean).join(" · ") || "תיק מועמד"}
            </p>
            {candidate.email ? (
              <p className="mt-1 truncate text-xs font-medium text-text-muted" dir="ltr">
                {candidate.email}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-extrabold text-text-primary">
            {candidate.status_label}
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-text-muted">
            <Route size={12} />
            מסלול המיון
          </div>
          <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {stages.map((stage) => (
              <li
                key={stage.key}
                className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-sm ${
                  stage.state === "current"
                    ? "bg-violet-500/12 font-extrabold text-text-primary"
                    : stage.state === "done"
                      ? "bg-emerald-500/10 font-bold text-text-primary"
                      : "bg-surface-2/70 font-semibold text-text-muted"
                }`}
              >
                <span className="truncate">{stage.name}</span>
                <span className="shrink-0 text-[10px] font-bold opacity-75">
                  {stage.state === "done" ? "הושלם" : stage.state === "current" ? "נוכחי" : "ממתין"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FileAccordion
        icon={UserRound}
        title="פרטים אישיים"
        tone="sky"
        defaultOpen
        badge={
          <span className="rounded-full bg-surface-1/80 px-2 py-0.5 text-[10px] font-bold tabular-nums text-text-muted">
            {personalDetails.reduce((sum, section) => sum + section.fields.length, 0)}
          </span>
        }
      >
        {personalDetails.length === 0 ? (
          <EmptyHint text="אין פרטים להצגה." />
        ) : (
          <div className="space-y-4">
            {personalDetails.map((section) => (
              <div key={section.section}>
                <p className="mb-2 text-[11px] font-extrabold tracking-wide text-text-muted">{section.section}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <FieldChip
                      key={field.key}
                      label={field.label}
                      value={field.value}
                      wide={field.key === "phone" || section.fields.length === 1}
                      ltr={field.key.includes("email") || field.key.includes("phone")}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </FileAccordion>

      <ExamsBoard groups={examGroups} />

      <FileAccordion
        icon={GraduationCap}
        title="ציונים והערכות"
        tone="violet"
        defaultOpen
        badge={
          <span className="rounded-full bg-surface-1/80 px-2 py-0.5 text-[10px] font-bold tabular-nums text-text-muted">
            {sportsResults.length > 0 ? `${sportsResults.length} תמונות` : "ספורט"}
          </span>
        }
      >
        <div className="space-y-4">
          {!hasScoreDetails ? <EmptyHint text="עדיין אין הערכות בתיק." /> : null}

          {scores.dayEvaluations.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-extrabold text-text-muted">יום מיונים</p>
              {scores.dayEvaluations.map((row, index) => (
                <div key={`day-${index}`} className="rounded-2xl bg-surface-2/70 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-text-primary">{row.evaluator_name ?? "מעריך"}</span>
                    <PassPill value={row.passed} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <FieldChip label="ציון סופי" value={<ScoreValue value={row.final_score} />} />
                    <FieldChip label="משוקלל" value={<ScoreValue value={row.weighted_score} />} />
                  </div>
                  {row.scores.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {row.scores.map((score) => (
                        <li key={score.key} className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-text-muted">{score.label}</span>
                          <ScoreValue value={score.value} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {scores.interviews.some((row) => row.completed || row.recommendation) ? (
            <div className="space-y-2">
              <p className="text-[11px] font-extrabold text-text-muted">ראיונות</p>
              {scores.interviews.map((row, index) => (
                <div
                  key={`interview-${index}`}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-surface-2/70 px-3 py-2.5"
                >
                  <span className="text-sm font-extrabold text-text-primary">{row.evaluator_name ?? "מראיין"}</span>
                  <span className="text-xs font-bold text-text-secondary">
                    {row.recommendation ?? (row.completed ? "הושלם" : "—")}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {scores.prepDays.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-extrabold text-text-muted">יום מכין</p>
              {scores.prepDays.map((row, index) => (
                <div key={`prep-${index}`} className="rounded-2xl bg-surface-2/70 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-text-primary">{row.evaluator_name ?? "מעריך"}</span>
                    <PassPill value={row.passed} />
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <FieldChip label="מקראות" value={<ScoreValue value={row.mikra_score} />} />
                    <FieldChip label="שיחה" value={<ScoreValue value={row.conversation_score} />} />
                    <FieldChip label="דינמיקה" value={<ScoreValue value={row.social_dynamics_score} />} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {scores.smach.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-extrabold text-text-muted">סמ״ח</p>
              {scores.smach.map((row, index) => (
                <div key={`smach-${index}`} className="space-y-2 rounded-2xl bg-surface-2/70 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-text-primary">{row.evaluator_name ?? "מעריך"}</span>
                    <PassPill value={row.passed} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldChip label="ציון משוקלל" value={<ScoreValue value={row.weighted_score} />} />
                    <FieldChip label="המלצה" value={row.decision ?? "—"} />
                  </div>
                  <ul className="space-y-1.5">
                    {row.thresholds
                      .filter((test) => test.value != null || test.pass != null)
                      .map((test) => (
                        <li key={test.key} className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-text-muted">{test.label}</span>
                          <span className="flex items-center gap-2">
                            <ScoreValue value={test.value} />
                            <PassPill value={test.pass} />
                          </span>
                        </li>
                      ))}
                  </ul>
                  {row.professional.some((item) => item.value != null) ? (
                    <ul className="space-y-1.5 border-t border-border-weak/40 pt-2">
                      {row.professional
                        .filter((item) => item.value != null)
                        .map((item) => (
                          <li key={item.key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 flex-1 font-semibold text-text-muted">{item.label}</span>
                            <ScoreValue value={item.value} />
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="rounded-2xl bg-emerald-500/[0.07] px-3 py-3 dark:bg-emerald-500/10">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold text-text-primary">
              <Activity size={13} />
              תמונות תוצאות ספורט
            </p>
            <p className="mb-3 text-[11px] leading-relaxed text-text-secondary">
              העלו צילום של תוצאות הריצה / שכיבות סמיכה. המנהל יראה אותן בתיק.
            </p>
            {sportsResults.length > 0 ? (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {sportsResults.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-xl bg-surface-1 shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.href} alt={item.name} className="aspect-[3/4] w-full object-cover" />
                    <p className="truncate px-2 py-1.5 text-[10px] font-semibold text-text-muted">
                      {formatAgamDate(item.created_at)}
                    </p>
                  </a>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className={`${primaryButtonClass} w-full`}
              disabled={sportsUploading}
              onClick={() => sportsInputRef.current?.click()}
            >
              {sportsUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {sportsResults.length > 0 ? "הוספת תמונה נוספת" : "העלאת תמונת תוצאות"}
            </button>
          </div>
        </div>
      </FileAccordion>

      <FileAccordion
        icon={FileUp}
        title="מסמכים"
        tone="amber"
        defaultOpen
        badge={
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDocsGuideOpen(true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-1 text-amber-700 shadow-sm transition hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-200"
              title="הסבר על המסמכים הנדרשים"
              aria-label="הסבר על המסמכים הנדרשים"
            >
              <Info size={15} strokeWidth={2.5} />
            </button>
            <span className="rounded-full bg-surface-1/80 px-2 py-0.5 text-[10px] font-bold tabular-nums text-text-muted">
              {requiredDone}/{documents.required.length}
            </span>
          </span>
        }
      >
        <p className="mb-3 text-xs leading-relaxed text-text-secondary">
          העלו את המסמכים הנדרשים. קבצים עד 4MB · PDF, Word, Excel או תמונה.
        </p>

        <ul className="space-y-2">
          {documents.required.map((doc) => (
            <li key={doc.key} className="rounded-2xl bg-surface-2/70 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-text-primary">{doc.type}</p>
                  <p className="mt-0.5 text-[11px] text-text-muted">{doc.reason}</p>
                  {doc.documentName ? (
                    <p className="mt-1 truncate text-xs font-semibold text-text-secondary">{doc.documentName}</p>
                  ) : null}
                </div>
                {doc.approved ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-200">
                    <Check size={12} strokeWidth={3} />
                    אושר
                  </span>
                ) : doc.uploaded ? (
                  <span className="shrink-0 text-[11px] font-bold text-amber-700 dark:text-amber-200">ממתין לאישור</span>
                ) : (
                  <span className="shrink-0 text-[11px] font-bold text-text-muted">חסר</span>
                )}
              </div>
              <button
                type="button"
                className={`${secondaryButtonClass} mt-3 w-full`}
                disabled={uploadingKey === doc.type}
                onClick={() => pickFile(doc.type)}
              >
                {uploadingKey === doc.type ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {doc.uploaded ? "החלפת קובץ" : "העלאת מסמך"}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-2xl bg-surface-2/50 px-3 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-text-primary">
            <ClipboardList size={13} />
            מסמך נוסף
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="ui-field h-11 w-full flex-1 rounded-xl bg-surface-1 px-3 text-sm font-semibold text-text-primary outline-none"
              value={extraType}
              onChange={(event) => setExtraType(event.target.value)}
            >
              {documents.docTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`${primaryButtonClass} h-11 w-full sm:w-auto`}
              disabled={uploadingKey === extraType}
              onClick={() => pickFile(extraType)}
            >
              {uploadingKey === extraType ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              העלאה
            </button>
          </div>
        </div>

        {documents.uploaded.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-extrabold text-text-muted">כל המסמכים שהועלו</p>
            <ul className="space-y-1.5">
              {documents.uploaded.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/50 px-3 py-2 text-xs"
                >
                  <span className="min-w-0 truncate font-semibold text-text-primary">
                    {doc.document_type ?? "מסמך"} · {doc.name}
                  </span>
                  <span className="shrink-0 text-text-muted">
                    {formatAgamDate(doc.created_at)}
                    {doc.approved ? " · אושר" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </FileAccordion>

      <Modal
        open={docsGuideOpen}
        onClose={() => setDocsGuideOpen(false)}
        title="הסבר מסמכים נדרשים"
        subtitle="לחצו להגדלה או לפתיחת הקובץ המלא"
        size="lg"
      >
        <div className="space-y-3">
          <a
            href={DOCS_GUIDE_PDF}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-2xl bg-surface-2"
          >
            {/* plain img: public static asset, avoid /_next/image + auth middleware on /agam */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DOCS_GUIDE_IMAGE}
              alt="הסבר על המסמכים שיש להעלות"
              className="mx-auto h-auto w-full object-contain"
            />
          </a>
          <a
            href={DOCS_GUIDE_PDF}
            target="_blank"
            rel="noreferrer"
            className={`${secondaryButtonClass} w-full`}
          >
            פתיחת הקובץ המלא (PDF)
          </a>
        </div>
      </Modal>
    </div>
  );
}
