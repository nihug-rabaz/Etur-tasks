"use client";

import { ChevronLeft, MessagesSquare, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { RECOMMENDATION_TONES } from "@/modules/agam/lib/stages";
import { secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamInterview, AgamQuestion } from "@/modules/agam/types";

type InterviewField = { key: string; label: string; text: string };

const PREVIEW_CHARS = 140;
const PREVIEW_LINES = 2;

function interviewFields(interview: AgamInterview, questions: AgamQuestion[]): InterviewField[] {
  const data = interview.interview_data ?? {};
  const known = questions
    .filter((question) => question.question_type === "interview")
    .map((question) => ({ key: question.field_key, label: question.question_text }));
  const knownKeys = new Set(known.map((field) => field.key));
  const extra = Object.keys(data)
    .filter((key) => !knownKeys.has(key))
    .map((key) => ({ key, label: key }));
  const fields = [...known, ...extra]
    .map((field) => ({ ...field, text: String(data[field.key] ?? "").trim() }))
    .filter((field) => field.text !== "");
  const assessment = interview.evaluator_assessment?.trim();
  if (assessment) fields.push({ key: "evaluator_assessment", label: "התרשמות המעריך", text: assessment });
  return fields;
}

function isLong(text: string): boolean {
  return text.length > PREVIEW_CHARS || text.split("\n").length > PREVIEW_LINES;
}

function RecommendationPill({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
        RECOMMENDATION_TONES[value] ?? "bg-surface-1 text-text-secondary"
      }`}
    >
      {value}
    </span>
  );
}

/** Interview preview in the candidate file; long answers open in a full-text modal. */
export function InterviewSummaryCard({
  interview,
  questions,
  candidateId,
  canEdit = false,
}: {
  interview: AgamInterview;
  questions: AgamQuestion[];
  candidateId: string;
  canEdit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fields = interviewFields(interview, questions);
  const hasMore = fields.some((field) => isLong(field.text));
  const evaluator = interview.evaluator_name ?? "מעריך";

  return (
    <>
      <article className="rounded-xl bg-surface-2/70 px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-primary">{evaluator}</p>
            <p className="text-[11px] text-text-muted">{formatAgamDate(interview.created_at)}</p>
          </div>
          <RecommendationPill value={interview.recommendation} />
        </div>

        {fields.length > 0 ? (
          <dl className="mt-2.5 space-y-2">
            {fields.map((field) => (
              <div key={field.key}>
                <dt className="text-[11px] font-bold text-text-muted">{field.label}</dt>
                <dd className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-text-primary">
                  {field.text}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-xs text-text-muted">לא הוזנו פרטים בראיון</p>
        )}

        {hasMore ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-accent-primary transition hover:underline"
          >
            לחצו לעוד פרטים…
            <ChevronLeft size={13} />
          </button>
        ) : null}
      </article>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`ראיון — ${evaluator}`}
        subtitle={formatAgamDate(interview.created_at)}
        icon={<MessagesSquare size={18} />}
        size="md"
        footer={
          canEdit ? (
            <Link href={`/agam/candidates/${candidateId}/interview?interviewId=${interview.id}`} className={secondaryButtonClass}>
              <Pencil size={14} />
              עריכת הראיון
            </Link>
          ) : null
        }
      >
        <div className="space-y-4">
          {interview.recommendation ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2/60 px-4 py-3">
              <span className="text-sm font-bold text-text-secondary">המלצה</span>
              <RecommendationPill value={interview.recommendation} />
            </div>
          ) : null}
          {fields.map((field) => (
            <section key={field.key} className="rounded-2xl bg-surface-2/60 px-4 py-3.5">
              <h3 className="text-[13px] font-extrabold text-text-primary">{field.label}</h3>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-7 text-text-secondary">{field.text}</p>
            </section>
          ))}
        </div>
      </Modal>
    </>
  );
}
