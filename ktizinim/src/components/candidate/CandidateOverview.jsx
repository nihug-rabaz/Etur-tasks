import React from 'react';
import { useNavigate } from 'react-router-dom';
import { STAGES } from '@/lib/stages';
import { useUserRole } from '@/hooks/useUserRole';
import TimelineView from '@/components/candidate/TimelineView';
import ProfileQuestionnaire from '@/components/candidate/ProfileQuestionnaire';
import ProfileEvaluations from '@/components/candidate/ProfileEvaluations';
import ProfileDocuments from '@/components/candidate/ProfileDocuments';
import ProfileDecision from '@/components/candidate/ProfileDecision';

// Comprehensive candidate profile — consolidates all data in one place:
// quick stage links, questionnaire, all evaluations, documents, final decision, and timeline.
export default function CandidateOverview({ candidate }) {
  const navigate = useNavigate();
  const { isRamad } = useUserRole();

  const visibleStages = STAGES.filter((s) => {
    if (!s.requiredRole) return true;
    if (s.requiredRole === 'ramad') return isRamad;
    return false;
  });

  const openStage = (key) => navigate(`/candidate?id=${candidate.id}&stage=${key}`);

  return (
    <div className="space-y-8">
      {/* Quick stage navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleStages.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => openStage(s.key)}
              className="bg-white rounded-2xl border border-slate-100 p-6 text-right hover:border-primary/30 hover:shadow-md transition group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${s.colorClass}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="font-bold text-base mb-1">{s.name}</div>
              <div className="text-sm text-slate-500">{s.description}</div>
            </button>
          );
        })}
      </div>

      {/* Pre-screening questionnaire */}
      <ProfileQuestionnaire candidate={candidate} />

      {/* All evaluations and interviews */}
      <ProfileEvaluations cid={candidate.id} />

      {/* Documents */}
      <ProfileDocuments cid={candidate.id} />

      {/* Final decision */}
      <ProfileDecision candidate={candidate} />

      {/* Timeline */}
      <div>
        <h2 className="font-display text-lg font-bold mb-3">ציר זמן</h2>
        <TimelineView candidateId={candidate.id} />
      </div>
    </div>
  );
}