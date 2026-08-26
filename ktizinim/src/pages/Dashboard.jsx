import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Link, useNavigate } from "react-router-dom";
import { Users, CheckCircle, XCircle, Clock, Copy, Check, Star, Gavel, FileText } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/scoring";
import { Button } from "@/components/ui/button";

function StatCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold font-display">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { isRamad } = useUserRole();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [evals, setEvals] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Candidate.list('-created_date', 500),
      base44.entities.Interview.list('-created_date', 500),
      base44.entities.DayEvaluation.list('-created_date', 500),
      base44.entities.CandidateDocument.list('-created_date', 500),
    ])
      .then(([c, iv, ev, d]) => {
        setCandidates(c);
        setInterviews(iv);
        setEvals(ev);
        setDocs(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const total = candidates.length;
  const passed = candidates.filter((c) => c.status === 'passed').length;
  const notPassed = candidates.filter((c) => c.status === 'not_passed').length;
  const pending = candidates.filter((c) => c.status === 'pending').length;

  const evalByCand = {};
  evals.forEach((e) => { evalByCand[e.candidate_id] = (evalByCand[e.candidate_id] || 0) + 1; });
  const dayCompleted = candidates.filter((c) => evalByCand[c.id]).length;
  const awaitingDecision = candidates.filter((c) => c.status === 'pending' && evalByCand[c.id]).length;

  const docByCand = {};
  docs.forEach((d) => { docByCand[d.candidate_id] = (docByCand[d.candidate_id] || 0) + 1; });
  const withDocs = candidates.filter((c) => docByCand[c.id]).length;

  const publicLink = `${window.location.origin}/apply`;
  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">שלום, {user?.full_name || 'משתמש'}</h1>
        <p className="text-slate-500 text-sm mt-1">מערכת ניהול מועמדים לקורס קציני דת</p>
      </div>

      {isRamad && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="סה״כ מועמדים" value={loading ? '—' : total} icon={Users} colorClass="bg-blue-100 text-blue-600" />
            <StatCard label="עברו" value={loading ? '—' : passed} icon={CheckCircle} colorClass="bg-emerald-100 text-emerald-600" />
            <StatCard label="לא עברו" value={loading ? '—' : notPassed} icon={XCircle} colorClass="bg-rose-100 text-rose-600" />
            <StatCard label="ממתינים" value={loading ? '—' : pending} icon={Clock} colorClass="bg-amber-100 text-amber-600" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="סיימו יום מיונים" value={loading ? '—' : dayCompleted} icon={Star} colorClass="bg-blue-50 text-blue-600" />
            <StatCard label="ממתינים להחלטה" value={loading ? '—' : awaitingDecision} icon={Gavel} colorClass="bg-emerald-50 text-emerald-600" />
            <StatCard label="עם מסמכים" value={loading ? '—' : withDocs} icon={FileText} colorClass="bg-amber-50 text-amber-600" />
          </div>
        </>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="text-sm font-medium mb-2">קישור לשאלון מקדים (לשיתוף עם מועמדים)</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-50 border rounded-xl px-3 py-2 text-sm text-slate-600 truncate">{publicLink}</div>
          <Button variant="outline" size="sm" onClick={copyLink} className="gap-2 shrink-0">
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'הועתק' : 'העתק'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">מועמדים אחרונים</h2>
          <Link to="/candidates" className="text-sm text-primary hover:underline">כל המועמדים ←</Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">טוען...</div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8 text-slate-400">אין מועמדים עדיין</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {candidates.filter((c) => !c.archived).slice(0, 10).map((c) => (
              <button key={c.id} onClick={() => navigate(`/candidate?id=${c.id}`)}
                className="w-full flex items-center justify-between py-3 hover:bg-slate-50 rounded-xl px-2 transition text-right">
                <div>
                  <div className="font-medium text-sm">{c.full_name}</div>
                  <div className="text-xs text-slate-400">{c.personal_number}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] || STATUS_COLORS.pending}`}>
                  {STATUS_LABELS[c.status] || STATUS_LABELS.pending}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}