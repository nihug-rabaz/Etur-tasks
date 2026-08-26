"use client";

import { useState } from "react";
import { toast } from "sonner";
import { agamFetch } from "@/modules/agam/lib/agam-fetch";
import { fieldClass, primaryButtonClass } from "@/modules/agam/lib/ui";
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
      <div className="dashboard-glass space-y-4 rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold text-text-primary">היום המכין</h2>
        {canEvaluate ? (
          <>
            <ScoreBlock label="מקראות ישראל" value={mikraScore} onChange={setMikraScore} />
            <ScoreBlock
              label="העברת שיחה"
              value={conversationScore}
              onChange={setConversationScore}
              feedback={conversationFeedback}
              onFeedback={setConversationFeedback}
            />
            <ScoreBlock
              label="דינמיקות חברתיות"
              value={socialDynamicsScore}
              onChange={setSocialDynamicsScore}
              feedback={socialDynamicsFeedback}
              onFeedback={setSocialDynamicsFeedback}
            />
            <label className="block space-y-2 text-sm font-bold text-text-secondary">
              רושם כללי
              <textarea
                className={fieldClass}
                rows={4}
                value={generalImpression}
                onChange={(event) => setGeneralImpression(event.target.value)}
              />
            </label>
            <button type="button" className={primaryButtonClass} onClick={() => void onSave()} disabled={saving}>
              {saving ? "שומר…" : "שמירה"}
            </button>
          </>
        ) : (
          <p className="text-sm text-text-muted">צפייה בלבד.</p>
        )}
      </div>
      {others.map((row) => (
        <div key={row.id} className="dashboard-glass space-y-2 rounded-3xl p-5">
          <p className="font-bold">{row.evaluator_name}</p>
          <p className="text-sm text-text-muted">
            מקרא {row.mikra_score ?? "—"} · שיחה {row.conversation_score ?? "—"} · דינמיקה{" "}
            {row.social_dynamics_score ?? "—"}
          </p>
          {row.conversation_feedback ? (
            <p className="text-sm text-text-secondary">שיחה: {row.conversation_feedback}</p>
          ) : null}
          {row.social_dynamics_feedback ? (
            <p className="text-sm text-text-secondary">דינמיקה: {row.social_dynamics_feedback}</p>
          ) : null}
          {row.general_impression ? (
            <p className="mt-1 whitespace-pre-wrap text-sm">{row.general_impression}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ScoreBlock({
  label,
  value,
  onChange,
  feedback,
  onFeedback,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  feedback?: string;
  onFeedback?: (value: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl bg-surface-2 p-4">
      <label className="block text-sm font-bold text-text-secondary">
        {label} (1–100)
        <input
          type="number"
          min={1}
          max={100}
          dir="ltr"
          className={`${fieldClass} mt-2 max-w-[140px] text-left`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {onFeedback ? (
        <textarea
          className={fieldClass}
          placeholder="משוב"
          value={feedback}
          onChange={(event) => onFeedback(event.target.value)}
        />
      ) : null}
    </div>
  );
}
