import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Trash2, Archive, FolderArchive } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/scoring";
import { STAGE_VIEWS } from "@/lib/candidateStageViews";
import CandidateActionBar from "@/components/candidate/CandidateActionBar";

const buildCSV = (candidates, preQs) => {
  const bom = '\uFEFF';
  const qHeaders = preQs.map(q => q.question_text);
  const headers = ['שם מלא', 'מספר אישי', 'טלפון', 'תאריך מילוי', 'סטטוס', ...qHeaders];
  const rows = candidates.map(c => {
    const qData = c.questionnaire_data || {};
    const qValues = preQs.map(q => qData[q.field_key] ?? '');
    return [
      c.full_name, c.personal_number, c.phone || '',
      new Date(c.created_date).toLocaleDateString('he-IL'),
      STATUS_LABELS[c.status] || STATUS_LABELS.pending,
      ...qValues
    ];
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  return new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
};

export default function Candidates() {
  const navigate = useNavigate();
  const { isRamad, isAdmin } = useUserRole();
  const [candidates, setCandidates] = useState([]);
  const [preQs, setPreQs] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeStageKey, setActiveStageKey] = useState(STAGE_VIEWS[0].key);
  const [stageData, setStageData] = useState({});
  const [stageLoading, setStageLoading] = useState(false);

  const activeStage = STAGE_VIEWS.find((s) => s.key === activeStageKey);

  const load = () => {
    Promise.all([
      base44.entities.Candidate.list('-created_date', 500),
      base44.entities.QuestionnaireQuestion.filter({ question_type: 'pre_screening', is_active: true }),
    ]).then(([c, qs]) => {
      setCandidates(c);
      setPreQs(qs.sort((a, b) => a.section_number - b.section_number || a.sort_order - b.sort_order));
      setLoading(false);
    });
  };

  useEffect(load, []);

  // Load stage-specific data on demand (cached per stage for fast switching).
  useEffect(() => {
    if (!activeStage || stageData[activeStage.key]) return;
    setStageLoading(true);
    activeStage.load()
      .then((d) => setStageData((prev) => ({ ...prev, [activeStage.key]: d })))
      .catch(() => {})
      .finally(() => setStageLoading(false));
  }, [activeStageKey]);

  const filtered = candidates.filter(c => {
    const isArchived = c.archived === true;
    if (showArchived ? !isArchived : isArchived) return false;
    const matchSearch = !search ||
      (c.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.personal_number || '').includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק מועמד זה לצמיתות?')) return;
    await base44.entities.Candidate.delete(id);
    load();
  };

  const handleArchive = async (c) => {
    const action = c.archived ? 'שחזר' : 'העבר לארכיון';
    if (!window.confirm(`${action} את ${c.full_name}?`)) return;
    await base44.entities.Candidate.update(c.id, { archived: !c.archived });
    load();
  };

  const downloadCSV = () => {
    const blob = buildCSV(filtered, preQs);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'מועמדים.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const data = stageData[activeStage.key] || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{showArchived ? 'ארכיון מועמדים' : 'ניהול מועמדים'}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} מועמדים</p>
        </div>
      </div>

      {/* Stage navigation */}
      <div className="flex gap-1.5 flex-wrap bg-white rounded-2xl border border-slate-100 p-2">
        {STAGE_VIEWS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveStageKey(s.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${activeStageKey === s.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או מספר אישי" className="pr-9 h-11" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-input rounded-md px-3 py-2 text-sm bg-white h-11">
          <option value="all">כל הסטטוסים</option>
          <option value="pending">ממתין</option>
          <option value="passed">עבר</option>
          <option value="not_passed">לא עבר</option>
        </select>
        {isRamad && (
          <Button variant="outline" onClick={() => setShowArchived(a => !a)} className="gap-2 h-11">
            <FolderArchive className="w-4 h-4" />
            {showArchived ? 'חזרה לרשימה הראשית' : 'ארכיון'}
          </Button>
        )}
        {isRamad && (
          <Button variant="outline" onClick={downloadCSV} className="gap-2 h-11">
            <Download className="w-4 h-4" /> ייצוא Excel
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">טוען...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">שם מלא</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 hidden md:table-cell">מספר אישי</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 hidden lg:table-cell">תאריך מילוי</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">סטטוס</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 hidden md:table-cell">{activeStage.columnHeader}</th>
                  <th className="py-3 px-4 text-right font-medium text-slate-600">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-14 text-slate-400">לא נמצאו מועמדים</td></tr>
                )}
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-medium">
                      <button onClick={() => navigate(`/candidate?id=${c.id}`)} className="text-right hover:text-primary transition">
                        {c.full_name}
                      </button>
                      <div className="text-xs text-slate-400 md:hidden">{c.personal_number}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 hidden md:table-cell">{c.personal_number}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs hidden lg:table-cell">
                      {new Date(c.created_date).toLocaleDateString('he-IL')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] || STATUS_COLORS.pending}`}>
                        {STATUS_LABELS[c.status] || STATUS_LABELS.pending}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      {stageLoading && !stageData[activeStage.key] ? (
                        <span className="text-slate-300 text-xs">טוען...</span>
                      ) : activeStage.cell(c, data)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CandidateActionBar candidate={c} />
                        {isRamad && (
                          <Button size="sm" variant="ghost" onClick={() => handleArchive(c)} className="gap-1.5 h-9 px-2" title={c.archived ? 'שחזר' : 'העבר לארכיון'}>
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="gap-1.5 h-9 px-2 text-rose-500 hover:text-rose-600" title="מחיקה">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}