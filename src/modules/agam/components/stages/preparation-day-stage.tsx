"use client";

import { useState } from "react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { cardClass, innerCardClass, panelClass, fieldClass, primaryButtonClass, dividerTopClass } from "@/modules/agam/lib/ui";
import type { AgamPrepDayEvaluation } from "@/modules/agam/types";

export function PreparationDayStage({
  candidateId,
  evaluations,
  currentUserId,
  canEvaluate,
  onSaved,
}: {
  candidateId: string;
  evaluations: AgamPrepDayEvaluation[];
  currentUserId: string;
  canEvaluate: boolean;
  onSaved: () => void;
}) {
  const mine = evaluations.find((row) => row.evaluator_id === currentUserId);
  const others = evaluations.filter((row) => row.evaluator_id !== currentUserId);
  const [mikraScore, setMikraScore] = useState(mine?.mikra_score?.toString() ?? "");
  const [conversationScore, setConversationScore] = useState(mine?.conversation_score?.toString() ?? "");
  const [conversationFeedback, setConversationFeedback] = useState(mine?.conversation_feedback ?? "");
  const [socialDynamicsScore, setSocialDynamicsScore] = useState(
    mine?.social_dynamics_score?.toString() ?? "",
  );
  const [socialDynamicsFeedback, setSocialDynamicsFeedback] = useState(
    mine?.social_dynamics_feedback ?? "",
  );
  const [generalImpression, setGeneralImpression] = useState(mine?.general_impression ?? "");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    try {
      await agamFetch("/api/agam/prep-day", {
        method: "POST",
        body: JSON.stringify({
          candidateId,
          mikraScore: mikraScore ? Number(mikraScore) : null,
          conversationScore: conversationScore ? Number(conversationScore) : null,
          conversationFeedback,
          socialDynamicsScore: socialDynamicsScore ? Number(socialDynamicsScore) : null,
          socialDynamicsFeedback,
          generalImpression,
        }),
      });
      toast.success("היום המכין נשמר");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`${panelClass} space-y-4 p-6`}>
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary">הערכת היום המכין</h2>
          <p className="mt-1 text-sm text-text-muted">
            ההערכה שלך כמעריך. כל מעריך ממלא הערכה נפרדת.
          </p>
        </div>
        {canEvaluate ? (
          <>
            <ScoreBlock
              title={'מבחן "מקראות ישראל"'}
              subtitle="הזנת ציון בלבד"
              value={mikraScore}
              onChange={setMikraScore}
            />
            <ScoreBlock
              title="התנסות בהעברת שיחה"
              value={conversationScore}
              onChange={setConversationScore}
              feedback={conversationFeedback}
              onFeedback={setConversationFeedback}
            />
            <ScoreBlock
              title="דינמיקות חברתיות"
              value={socialDynamicsScore}
              onChange={setSocialDynamicsScore}
              feedback={socialDynamicsFeedback}
              onFeedback={setSocialDynamicsFeedback}
            />
            <div className={`${cardClass} space-y-2`}>
              <h3 className="text-sm font-extrabold text-text-primary">
                התרשמות כללית של המעריך מהמועמד לאורך היום
              </h3>
              <p className="text-xs text-text-muted">סיכום חופשי — ללא ציון</p>
              <textarea
                className={fieldClass}
                rows={5}
                placeholder="כתוב סיכום חופשי של התרשמותך מהמועמד לאורך היום..."
                value={generalImpression}
                onChange={(event) => setGeneralImpression(event.target.value)}
              />
            </div>
            <button type="button" className={primaryButtonClass} onClick={() => void onSave()} disabled={saving}>
              {saving ? "שומר…" : mine ? "עדכון הערכה" : "שמירת הערכה"}
            </button>
          </>
        ) : (
          <p className="text-sm text-text-muted">צפייה בלבד.</p>
        )}
      </div>

      {others.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text-secondary">
            הערכות מעריכים נוספים ({others.length})
          </h3>
          {others.map((row) => (
            <PrepReadOnlyCard key={row.id} evaluation={row} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PrepReadOnlyCard({ evaluation }: { evaluation: AgamPrepDayEvaluation }) {
  const scores = [
    { label: "מקראות ישראל", value: evaluation.mikra_score },
    { label: "העברת שיחה", value: evaluation.conversation_score },
    { label: "דינמיקות חברתיות", value: evaluation.social_dynamics_score },
  ];

  return (
    <article className={`${panelClass} space-y-4 p-5`}>
      <div>
        <p className="font-extrabold text-text-primary">{evaluation.evaluator_name ?? "מעריך"}</p>
        <p className="text-xs text-text-muted">
          {new Date(evaluation.created_at).toLocaleDateString("he-IL")}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {scores.map((score) => (
          <div key={score.label} className={`${innerCardClass} text-center`}>
            <p className="text-xl font-extrabold text-text-primary">{score.value ?? "—"}</p>
            <p className="mt-0.5 text-[11px] text-text-muted">{score.label}</p>
          </div>
        ))}
      </div>
      {evaluation.conversation_feedback ? (
        <div className={`${innerCardClass} text-sm`}>
          <p className="text-xs font-bold text-text-muted">התרשמות — העברת שיחה</p>
          <p className="mt-1 whitespace-pre-wrap">{evaluation.conversation_feedback}</p>
        </div>
      ) : null}
      {evaluation.social_dynamics_feedback ? (
        <div className={`${innerCardClass} text-sm`}>
          <p className="text-xs font-bold text-text-muted">התרשמות — דינמיקות חברתיות</p>
          <p className="mt-1 whitespace-pre-wrap">{evaluation.social_dynamics_feedback}</p>
        </div>
      ) : null}
      {evaluation.general_impression ? (
        <div className={`pt-3 ${dividerTopClass}`}>
          <p className="text-xs font-bold text-text-muted">התרשמות כללית</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{evaluation.general_impression}</p>
        </div>
      ) : null}
    </article>
  );
}

function ScoreBlock({
  title,
  subtitle,
  value,
  onChange,
  feedback,
  onFeedback,
}: {
  title: string;
  subtitle?: string;
  value: string;
  onChange: (value: string) => void;
  feedback?: string;
  onFeedback?: (value: string) => void;
}) {
  return (
    <div className={`${cardClass} space-y-2`}>
      <h3 className="text-sm font-extrabold text-text-primary">{title}</h3>
      {subtitle ? <p className="text-xs text-text-muted">{subtitle}</p> : null}
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={100}
          dir="ltr"
          className={`${fieldClass} max-w-[120px] text-center text-lg font-bold`}
          placeholder="—"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="text-sm text-text-muted">ציון 1–100</span>
      </div>
      {onFeedback ? (
        <textarea
          className={fieldClass}
          placeholder="התרשמות מילולית"
          rows={3}
          value={feedback}
          onChange={(event) => onFeedback(event.target.value)}
        />
      ) : null}
    </div>
  );
}
