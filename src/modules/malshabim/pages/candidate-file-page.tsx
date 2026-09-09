"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  History,
  Loader2,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { OBSERVANCE_QUESTIONS } from "@/modules/malshabim/lib/question-bank";
import { malshabimFetch } from "@/modules/malshabim/lib/fetch";
import {
  CANDIDATE_STATUSES,
  INSTRUCTION_STATUSES,
  STATUS_COLORS,
  formatDateTime,
  normalizeCandidateStatus,
} from "@/modules/malshabim/lib/status";
import {
  cardClass,
  fieldClass,
  formShellClass,
  pageTitleClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/modules/malshabim/lib/ui";
import type {
  MalshabimCandidate,
  MalshabimInstructionItem,
  MalshabimInstructionStatus,
} from "@/modules/malshabim/types";
import type { ModuleRole } from "@/shared/modules/types";

function canEditRole(role: ModuleRole | null): boolean {
  return role === "admin" || role === "user";
}

export function MalshabimCandidateFilePage({
  candidateId,
  initialCandidate = null,
  initialRole = null,
  initialUserName = "",
}: {
  candidateId: string;
  initialCandidate?: MalshabimCandidate | null;
  initialRole?: ModuleRole | null;
  initialUserName?: string;
}) {
  const [c, setC] = useState<MalshabimCandidate | null>(initialCandidate);
  const [role, setRole] = useState<ModuleRole | null>(initialRole);
  const [userName, setUserName] = useState(initialUserName);
  const [interviewerName, setInterviewerName] = useState("");
  const [notes, setNotes] = useState(initialCandidate?.interviewer_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [loaded, setLoaded] = useState(Boolean(initialCandidate));

  useEffect(() => {
    if (initialCandidate) return;
    void (async () => {
      try {
        const res = await malshabimFetch<{
          candidate: MalshabimCandidate;
          role: ModuleRole;
          currentUserName: string;
        }>(`/api/malshabim/candidates/${candidateId}`);
        setC(res.candidate);
        setRole(res.role);
        setUserName(res.currentUserName || "");
        setNotes(res.candidate.interviewer_notes || "");
      } catch {
        toast.error("טעינת התיק נכשלה");
      } finally {
        setLoaded(true);
      }
    })();
  }, [candidateId, initialCandidate]);

  useEffect(() => {
    const interviewerId = c?.interviewer_user_id;
    if (!interviewerId) {
      setInterviewerName("");
      return;
    }
    void (async () => {
      try {
        const res = await malshabimFetch<{
          interviewers?: Array<{ user_id: string; name: string }>;
        }>("/api/malshabim/interviewers");
        const match = (res.interviewers || []).find((u) => u.user_id === interviewerId);
        setInterviewerName(match?.name || "");
      } catch {
        setInterviewerName("");
      }
    })();
  }, [c?.interviewer_user_id]);

  const canEdit = canEditRole(role);
  const isAdmin = role === "admin";

  const patchCandidate = async (
    fields: Record<string, unknown>,
    logChanges: string,
  ) => {
    const res = await malshabimFetch<{ candidate: MalshabimCandidate }>(
      `/api/malshabim/candidates/${candidateId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ...fields,
          update_log_entry: {
            changes: logChanges,
            updated_by: userName || "משתמש",
          },
        }),
      },
    );
    setC(res.candidate);
    return res.candidate;
  };

  const saveNotes = async () => {
    if (!canEdit) return;
    setSavingNotes(true);
    try {
      await patchCandidate(
        { interviewer_notes: notes },
        "עודכנו הערות פנימיות של המראיינים",
      );
      toast.success("ההערות נשמרו");
    } catch {
      toast.error("שמירת הערות נכשלה");
    } finally {
      setSavingNotes(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!canEdit || !c) return;
    setUpdatingStatus(true);
    try {
      await patchCandidate(
        { candidate_status: newStatus },
        `סטטוס עודכן ל: ${newStatus}`,
      );
      toast.success("הסטטוס עודכן");
    } catch {
      toast.error("עדכון סטטוס נכשל");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateInstructionStatus = async (
    index: number,
    nextStatus: MalshabimInstructionStatus,
  ) => {
    if (!canEdit || !c) return;
    if (nextStatus === "הושלם" && !isAdmin) {
      toast.error("רק מנהל יכול לסמן הנחיה כהושלם");
      return;
    }
    const items = [...(c.instruction_items || [])] as MalshabimInstructionItem[];
    const current = items[index];
    if (!current) return;
    items[index] = { ...current, status: nextStatus };
    setUpdatingStatus(true);
    try {
      await patchCandidate(
        { instruction_items: items },
        `סטטוס הנחיה עודכן ל: ${nextStatus}`,
      );
      toast.success("הנחיה עודכנה");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "עדכון הנחיה נכשל");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const submitForApproval = async () => {
    if (!canEdit || !c || c.awaiting_admin_approval) return;
    setSubmittingApproval(true);
    try {
      await patchCandidate(
        { awaiting_admin_approval: true },
        "נשלח לאישור מנהל",
      );
      toast.success("התיק נשלח לאישור מנהל");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שליחה לאישור נכשלה");
    } finally {
      setSubmittingApproval(false);
    }
  };

  if (!loaded || !c) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  const status = normalizeCandidateStatus(c.candidate_status);
  const observance = (c.observance || {}) as Record<
    string,
    { answer?: string; note?: string }
  >;
  const requestMeta = c.request_meta || {};
  const instructionItems = (c.instruction_items || []) as MalshabimInstructionItem[];
  const interviewerLabel =
    interviewerName || c.created_by_name || (c.interviewer_user_id ? "מראיין משויך" : null);

  return (
    <div className={formShellClass} dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/malshabim" className={secondaryButtonClass}>
          חזרה לרשימה
        </Link>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {!c.awaiting_admin_approval ? (
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={submittingApproval}
                onClick={() => void submitForApproval()}
              >
                {submittingApproval ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                פתח תיק לאישור מנהל
              </button>
            ) : null}
            <Link
              href={`/malshabim/interview?id=${c.id}`}
              className={primaryButtonClass}
            >
              <Pencil className="h-4 w-4" /> עריכה
            </Link>
          </div>
        ) : null}
      </div>

      <article className={`${panelClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center`}>
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-4 ring-accent-primary/20">
          {c.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-text-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={pageTitleClass}>
            {c.full_name || "ללא שם"}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
            <Phone className="h-4 w-4" /> {c.phone || "—"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>מס׳ תיק: {c.serial_number ?? "—"}</Chip>
            {c.id_number ? <Chip>ת.ז: {c.id_number}</Chip> : null}
            {c.personal_number ? <Chip>מ.א: {c.personal_number}</Chip> : null}
            {c.city ? <Chip>מגורים: {c.city}</Chip> : null}
            {c.recruitment_track ? <Chip>{c.recruitment_track}</Chip> : null}
            {c.status_type ? <Chip>{c.status_type}</Chip> : null}
            {c.request_type ? <Chip>{c.request_type}</Chip> : null}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[status]}`}
            >
              {status}
            </span>
            {c.awaiting_admin_approval ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                <ShieldCheck className="h-3.5 w-3.5" />
                ממתין לאישור מנהל
              </span>
            ) : null}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white ${
                c.quiz_passed ? "bg-green-600" : "bg-rose-600"
              }`}
            >
              {c.quiz_passed ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              מבחן: {c.quiz_score ?? "—"}
            </span>
          </div>
        </div>
      </article>

      {canEdit ? (
        <article className={`${cardClass} space-y-3 p-5`}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <RefreshCw className="h-4 w-4" /> עדכון סטטוס
          </h2>
          <label className="block space-y-1.5 text-sm font-bold">
            סטטוס
            <select
              className={fieldClass}
              value={status}
              disabled={updatingStatus}
              onChange={(e) => void updateStatus(e.target.value)}
            >
              {CANDIDATE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </article>
      ) : null}

      <article className={`${cardClass} space-y-3 p-5`}>
        <h2 className="text-lg font-bold text-text-primary">פרטים</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field label="תאריך גיוס" value={c.enlistment_date} />
          <Field label="מועד ראיון" value={formatDateTime(c.interview_at)} />
          <Field label="מראיין" value={interviewerLabel} />
          <Field label="נוצר ע״י" value={c.created_by_name} />
          <Field
            label="נשלח לאישור"
            value={formatDateTime(c.approval_requested_at)}
          />
        </dl>
      </article>

      {(requestMeta.requester || requestMeta.unit || requestMeta.role || c.request_type) ? (
        <article className={`${cardClass} space-y-3 p-5`}>
          <h2 className="text-lg font-bold text-text-primary">פרטי בקשה</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="סוג" value={c.request_type} />
            <Field label="מבקש" value={requestMeta.requester} />
            <Field label="יחידה" value={requestMeta.unit} />
            <Field label="תפקיד" value={requestMeta.role} />
          </dl>
        </article>
      ) : null}

      <article className={`${panelClass} space-y-3 p-5`}>
        <h2 className="text-lg font-bold text-text-primary">הנחיות לביצוע</h2>
        {instructionItems.length === 0 ? (
          <p className="text-sm text-text-muted">אין הנחיות</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {instructionItems.map((item, index) => {
              const itemStatus = (item.status || "בטיפול") as MalshabimInstructionStatus;
              return (
                <li
                  key={index}
                  className="rounded-2xl border border-border-weak bg-surface-2/70 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="flex-1 whitespace-pre-wrap text-sm font-medium text-text-primary">
                      {item.text || "—"}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        itemStatus === "הושלם"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {itemStatus}
                    </span>
                  </div>
                  {canEdit ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {INSTRUCTION_STATUSES.filter((s) => s !== itemStatus).map((next) => {
                        const locked = next === "הושלם" && !isAdmin;
                        return (
                          <button
                            key={next}
                            type="button"
                            disabled={updatingStatus || locked}
                            className={`${secondaryButtonClass} !px-2 !py-1 text-[11px]`}
                            onClick={() => void updateInstructionStatus(index, next)}
                            title={locked ? "רק מנהל יכול לסמן הושלם" : undefined}
                          >
                            {next}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </article>

      <article className={`${cardClass} space-y-3 p-5`}>
        <h2 className="text-lg font-bold text-text-primary">שמירת מצוות</h2>
        <ul className="space-y-2">
          {OBSERVANCE_QUESTIONS.map((q) => (
            <li
              key={q.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border-weak bg-surface-2/60 px-3 py-2"
            >
              <span className="text-sm font-medium text-text-primary">{q.label}</span>
              <span className="text-sm font-bold">
                {observance[q.key]?.answer || "—"}
                {observance[q.key]?.note ? (
                  <span className="ms-2 font-normal text-text-muted">
                    ({observance[q.key]?.note})
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </article>

      <article className={`${cardClass} space-y-3 p-5`}>
        <h2 className="text-lg font-bold text-text-primary">סיכום ראיון</h2>
        <p className="whitespace-pre-wrap text-sm text-text-secondary">
          {c.interview_summary || "אין סיכום"}
        </p>
      </article>

      {canEdit ? (
        <article className={`${cardClass} space-y-3 p-5`}>
          <h2 className="text-lg font-bold text-text-primary">הערות פנימיות</h2>
          <textarea
            className={`${fieldClass} min-h-28`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => void saveNotes()}
            disabled={savingNotes}
          >
            {savingNotes ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            שמור הערות
          </button>
        </article>
      ) : c.interviewer_notes ? (
        <article className={`${cardClass} space-y-3 p-5`}>
          <h2 className="text-lg font-bold text-text-primary">הערות פנימיות</h2>
          <p className="whitespace-pre-wrap text-sm text-text-secondary">
            {c.interviewer_notes}
          </p>
        </article>
      ) : null}

      <article className={`${cardClass} space-y-3 p-5`}>
        <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
          <History className="h-4 w-4" /> יומן עדכונים
        </h2>
        {(c.update_log || []).length === 0 ? (
          <p className="text-sm text-text-muted">אין רשומות עדיין</p>
        ) : (
          <ul className="space-y-2">
            {[...(c.update_log || [])].reverse().map((log, i) => (
              <li key={i} className="rounded-xl border border-border-weak bg-surface-2/60 px-3 py-2">
                <p className="text-sm font-medium text-text-primary">
                  {log.changes || "—"}
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  {formatDateTime(log.date)} · {log.updated_by || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-xs font-bold text-text-primary">
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-text-primary">{value || "—"}</dd>
    </div>
  );
}
