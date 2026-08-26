import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import FileHeader from '@/components/candidate/FileHeader';
import CandidateOverview from '@/components/candidate/CandidateOverview';
import { getStage } from '@/lib/stages';

export default function CandidateProfile() {
  const params = new URLSearchParams(window.location.search);
  const cid = params.get('id');
  const stageKey = params.get('stage');
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cid) return;
    base44.entities.Candidate.get(cid)
      .then((c) => { setCandidate(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, [cid]);

  if (!cid) return <div className="text-center py-12 text-slate-500">מזהה מועמד חסר</div>;
  if (loading) return <div className="text-center py-12 text-slate-400">טוען...</div>;
  if (!candidate) return <div className="text-center py-12 text-slate-500">מועמד לא נמצא</div>;

  const stage = stageKey ? getStage(stageKey) : null;
  const StageComponent = stage?.component;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <FileHeader candidate={candidate} />

      {StageComponent ? (
        <div className="space-y-4">
          <button
            onClick={() => navigate(`/candidate?id=${cid}`)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition"
          >
            <ArrowRight className="w-4 h-4" /> חזרה לתיק המועמד
          </button>
          <h2 className="font-display text-xl font-bold">{stage.name}</h2>
          <StageComponent candidate={candidate} cid={cid} navigate={navigate} />
        </div>
      ) : (
        <CandidateOverview candidate={candidate} />
      )}
    </div>
  );
}