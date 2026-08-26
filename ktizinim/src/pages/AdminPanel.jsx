import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Check, X, UserCheck, UserX } from "lucide-react";
import SettingsTab from "@/components/admin/SettingsTab";
import ErrorBoundary from "@/components/ErrorBoundary";
import ExportTab from "@/components/admin/ExportTab";
import CriteriaTab from "@/components/admin/CriteriaTab";

const FIELD_TYPES = [
  { value: 'text', label: 'טקסט קצר' },
  { value: 'textarea', label: 'טקסט ארוך' },
  { value: 'number', label: 'מספר' },
  { value: 'select', label: 'בחירה מרשימה' },
];

const OPERATORS = [
  { value: 'eq', label: 'שווה ל' },
  { value: 'neq', label: 'שונה מ' },
  { value: 'gt', label: 'גדול מ' },
  { value: 'gte', label: 'גדול מ / שווה' },
  { value: 'lt', label: 'קטן מ' },
  { value: 'lte', label: 'קטן מ / שווה' },
];

function QuestionRow({ q, onSave, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ ...q });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setEdit(false);
  };

  if (!edit) return (
    <tr className="border-b border-slate-50 hover:bg-slate-50 transition">
      <td className="px-3 py-2.5 text-sm">{q.section_number}. {q.section_name}</td>
      <td className="px-3 py-2.5 text-sm font-medium">{q.question_text}</td>
      <td className="px-3 py-2.5 text-xs text-slate-500">{FIELD_TYPES.find(f => f.value === q.field_type)?.label}</td>
      <td className="px-3 py-2.5 text-center">
        <span className={`text-xs px-2 py-0.5 rounded-full ${q.is_required ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
          {q.is_required ? 'חובה' : 'רשות'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className={`text-xs px-2 py-0.5 rounded-full ${q.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
          {q.is_active ? 'פעיל' : 'מושבת'}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setEdit(true)}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-rose-500" onClick={() => onDelete(q.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </td>
    </tr>
  );

  return (
    <tr className="bg-blue-50 border-b border-blue-100">
      <td colSpan={6} className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><Label className="text-xs mb-1 block">מספר פרק</Label><Input type="number" value={form.section_number} onChange={e => setForm(f => ({ ...f, section_number: Number(e.target.value) }))} /></div>
          <div><Label className="text-xs mb-1 block">שם פרק</Label><Input value={form.section_name || ''} onChange={e => setForm(f => ({ ...f, section_name: e.target.value }))} /></div>
          <div className="col-span-2"><Label className="text-xs mb-1 block">טקסט השאלה</Label><Input value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">מפתח ייחודי (field_key)</Label><Input value={form.field_key} onChange={e => setForm(f => ({ ...f, field_key: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">סוג שדה</Label>
            <select className="border border-input rounded-md w-full px-3 py-1.5 text-sm" value={form.field_type} onChange={e => setForm(f => ({ ...f, field_type: e.target.value }))}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {form.field_type === 'select' && (
            <div className="col-span-2"><Label className="text-xs mb-1 block">אפשרויות (JSON array, לדוג׳: ["כן","לא"])</Label><Input value={form.options || ''} onChange={e => setForm(f => ({ ...f, options: e.target.value }))} /></div>
          )}
          <div><Label className="text-xs mb-1 block">תנאי - שדה</Label><Input value={form.condition_field || ''} onChange={e => setForm(f => ({ ...f, condition_field: e.target.value }))} placeholder="field_key של השדה המפעיל" /></div>
          <div><Label className="text-xs mb-1 block">תנאי - אופרטור</Label>
            <select className="border border-input rounded-md w-full px-3 py-1.5 text-sm" value={form.condition_operator || 'eq'} onChange={e => setForm(f => ({ ...f, condition_operator: e.target.value }))}>
              {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div><Label className="text-xs mb-1 block">תנאי - ערך</Label><Input value={form.condition_value || ''} onChange={e => setForm(f => ({ ...f, condition_value: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">סדר הצגה</Label><Input type="number" value={form.sort_order || 0} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
          <div className="flex gap-4 items-center mt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!form.is_required} onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} className="accent-primary" />
              שדה חובה
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-primary" />
              פעיל
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving} className="gap-1"><Check className="w-3.5 h-3.5" />{saving ? 'שומר...' : 'שמור'}</Button>
          <Button size="sm" variant="outline" onClick={() => setEdit(false)} className="gap-1"><X className="w-3.5 h-3.5" />ביטול</Button>
        </div>
      </td>
    </tr>
  );
}

const EMPTY_Q = { question_text: '', field_key: '', field_type: 'text', section_number: 1, section_name: '', is_required: true, is_active: true, sort_order: 0 };

function QuestionsTab({ questionType }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState({ ...EMPTY_Q, question_type: questionType });

  const load = () => {
    setError('');
    base44.entities.QuestionnaireQuestion.filter({ question_type: questionType })
      .then(qs => { setQuestions(qs.sort((a, b) => a.section_number - b.section_number || a.sort_order - b.sort_order)); setLoading(false); })
      .catch(err => { setError(err?.message || 'שגיאה בטעינת השאלות'); setLoading(false); });
  };
  useEffect(load, [questionType]);

  const handleSave = async (form) => {
    try {
      if (form.id) await base44.entities.QuestionnaireQuestion.update(form.id, form);
      else await base44.entities.QuestionnaireQuestion.create({ ...form, question_type: questionType });
      load();
    } catch (err) {
      alert(err?.message || 'שגיאה בשמירת השאלה');
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק שאלה זו?')) return;
    try {
      await base44.entities.QuestionnaireQuestion.delete(id);
      load();
    } catch (err) {
      alert(err?.message || 'שגיאה במחיקת השאלה');
    }
  };
  const addNew = async () => {
    try {
      await base44.entities.QuestionnaireQuestion.create({ ...newQ, question_type: questionType });
      setNewQ({ ...EMPTY_Q, question_type: questionType });
      setAdding(false);
      load();
    } catch (err) {
      alert(err?.message || 'שגיאה בהוספת השאלה');
    }
  };

  if (loading) return <div className="text-center py-8 text-slate-400">טוען...</div>;
  if (error) return (
    <div className="text-center py-8 text-rose-500 bg-rose-50 rounded-2xl border border-rose-100">
      שגיאה בטעינת השאלות: {error}
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-slate-500">{questions.length} שאלות</span>
        <Button onClick={() => setAdding(a => !a)} className="gap-1.5"><Plus className="w-4 h-4" />הוסף שאלה</Button>
      </div>

      {adding && (
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 mb-4">
          <h3 className="font-bold mb-4 text-sm">שאלה חדשה</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><Label className="text-xs mb-1 block">מספר פרק</Label><Input type="number" value={newQ.section_number} onChange={e => setNewQ(f => ({ ...f, section_number: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs mb-1 block">שם פרק</Label><Input value={newQ.section_name || ''} onChange={e => setNewQ(f => ({ ...f, section_name: e.target.value }))} /></div>
            <div className="col-span-2"><Label className="text-xs mb-1 block">טקסט השאלה *</Label><Input value={newQ.question_text} onChange={e => setNewQ(f => ({ ...f, question_text: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">מפתח ייחודי (field_key) *</Label><Input value={newQ.field_key} onChange={e => setNewQ(f => ({ ...f, field_key: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">סוג שדה</Label>
              <select className="border border-input rounded-md w-full px-3 py-1.5 text-sm" value={newQ.field_type} onChange={e => setNewQ(f => ({ ...f, field_type: e.target.value }))}>
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {newQ.field_type === 'select' && (
              <div className="col-span-2"><Label className="text-xs mb-1 block">אפשרויות (JSON array)</Label><Input value={newQ.options || ''} onChange={e => setNewQ(f => ({ ...f, options: e.target.value }))} /></div>
            )}
            <div><Label className="text-xs mb-1 block">תנאי - שדה</Label><Input value={newQ.condition_field || ''} onChange={e => setNewQ(f => ({ ...f, condition_field: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">תנאי - ערך</Label><Input value={newQ.condition_value || ''} onChange={e => setNewQ(f => ({ ...f, condition_value: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">סדר הצגה</Label><Input type="number" value={newQ.sort_order} onChange={e => setNewQ(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
            <div className="flex gap-4 items-center mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!newQ.is_required} onChange={e => setNewQ(f => ({ ...f, is_required: e.target.checked }))} className="accent-primary" /> שדה חובה
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addNew} className="gap-1"><Check className="w-3.5 h-3.5" />הוסף</Button>
            <Button variant="outline" onClick={() => setAdding(false)}>ביטול</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500">פרק</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500">שאלה</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500">סוג</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-slate-500">חובה</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-slate-500">פעיל</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">אין שאלות</td></tr>
              )}
              {questions.map(q => <QuestionRow key={q.id} q={q} onSave={handleSave} onDelete={handleDelete} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const load = () => {
    setError('');
    base44.entities.User.list()
      .then(u => { setUsers(u); setLoading(false); })
      .catch(err => {
        setError(err?.message || 'שגיאה בטעינת המשתמשים. ייתכן שיש צורך להתנתק ולהתחבר מחדש כדי שהרשאת המנהל תיכנס לתוקף.');
        setLoading(false);
      });
  };
  useEffect(load, []);

  const invite = async () => {
    if (!newEmail) return;
    setInviting(true);
    await base44.users.inviteUser(newEmail, 'user');
    setNewEmail('');
    setInviting(false);
    alert(`הזמנה נשלחה ל-${newEmail}. לאחר הרשמה, אשר את המשתמש בלשונית זו.`);
  };

  const changeRole = async (uid, role) => {
    try {
      // Promoting to "מנהל" also grants full platform admin access so this user
      // can see and manage all other users (required due to platform permissions).
      const payload = role === 'admin' ? { app_role: role, role: 'admin' } : { app_role: role };
      await base44.entities.User.update(uid, payload);
      load();
      if (role === 'admin') {
        alert('המשתמש הוגדר כמנהל. חשוב: על המשתמש להתנתק ולהתחבר מחדש כדי שהגישה המלאה (כולל צפייה בכל המשתמשים) תיכנס לתוקף.');
      }
    } catch (err) {
      alert('שגיאה בעדכון ההרשאה. רק מנהל מערכת מלא יכול לבצע פעולה זו.');
    }
  };

  const togglePlatformAdmin = async (u) => {
    try {
      const makingAdmin = u.role !== 'admin';
      await base44.entities.User.update(u.id, { role: makingAdmin ? 'admin' : 'user' });
      load();
      if (makingAdmin) {
        alert('הוענקה גישת מנהל מלאה. חשוב: על המשתמש להתנתק ולהתחבר מחדש כדי שהגישה תיכנס לתוקף.');
      }
    } catch (err) {
      alert('שגיאה בעדכון ההרשאה. רק מנהל מערכת מלא יכול לבצע פעולה זו.');
    }
  };

  const toggleApproval = async (u) => {
    await base44.entities.User.update(u.id, { approved: !u.approved });
    load();
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${u.full_name || u.email}?`)) return;
    await base44.entities.User.delete(u.id);
    load();
  };

  const pendingUsers = users.filter(u => !u.approved && u.role !== 'admin');
  const approvedUsers = users.filter(u => u.approved || u.role === 'admin');

  return (
    <div className="space-y-6">
      {/* Invite */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-bold mb-3">הזמן משתמש חדש</h3>
        <div className="flex gap-2 flex-wrap">
          <Input type="email" placeholder="כתובת מייל" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="flex-1 min-w-52 h-11" />
          <Button onClick={invite} disabled={inviting || !newEmail} className="gap-2 h-11">
            <Plus className="w-4 h-4" />{inviting ? 'שולח...' : 'שלח הזמנה'}
          </Button>
        </div>
      </div>

      {/* Pending approval */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
          <h3 className="font-bold mb-3 text-amber-800">ממתינים לאישור ({pendingUsers.length})</h3>
          <div className="space-y-2">
            {pendingUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                <div>
                  <div className="font-medium text-sm">{u.full_name || '—'}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => toggleApproval(u)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 h-9">
                    <UserCheck className="w-4 h-4" /> אשר
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteUser(u)} className="gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50 h-9">
                    <Trash2 className="w-4 h-4" /> דחה
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved users */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-sm">משתמשים מאושרים</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">שם</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">מייל</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">תפקיד</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && <tr><td colSpan={4} className="text-center py-10 text-slate-400">טוען...</td></tr>}
            {!loading && error && <tr><td colSpan={4} className="text-center py-10 text-rose-500">{error}</td></tr>}
            {!loading && !error && approvedUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      className="border border-input rounded-lg px-2 py-1.5 text-xs bg-white"
                      value={u.app_role || 'evaluator'}
                      onChange={e => changeRole(u.id, e.target.value)}>
                      <option value="evaluator">מעריך</option>
                      <option value="ramad">רמ"ד איתור</option>
                      <option value="admin">מנהל</option>
                    </select>
                    {u.role === 'admin' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">גישת מנהל מלאה</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => togglePlatformAdmin(u)} className="gap-1 text-primary border-primary/30 hover:bg-primary/5 h-8">
                      {u.role === 'admin' ? 'בטל גישת מנהל מלאה' : 'הענק גישת מנהל מלאה'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleApproval(u)} className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 h-8">
                      <UserX className="w-3.5 h-3.5" /> בטל אישור
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteUser(u)} className="gap-1 text-rose-500 border-rose-200 hover:bg-rose-50 h-8">
                      <Trash2 className="w-3.5 h-3.5" /> מחק
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  if (!isAdmin) return (
    <div className="text-center py-20">
      <p className="text-slate-500">גישה מוגבלת למנהלי מערכת בלבד</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>חזרה לדשבורד</Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">ניהול מערכת</h1>
        <p className="text-slate-500 text-sm">ניהול שאלונים, משתמשים והגדרות</p>
      </div>

      <Tabs defaultValue="users" dir="rtl">
        <TabsList className="mb-5">
          <TabsTrigger value="users">משתמשים</TabsTrigger>
          <TabsTrigger value="pre_screening">שאלון מקדים</TabsTrigger>
          <TabsTrigger value="interview">שאלות ריאיון</TabsTrigger>
          <TabsTrigger value="day_criteria">קריטריוני יום מיונים</TabsTrigger>
          <TabsTrigger value="settings">הגדרות מדור</TabsTrigger>
          <TabsTrigger value="export">ייצוא דוחות</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><ErrorBoundary><UsersTab /></ErrorBoundary></TabsContent>
        <TabsContent value="pre_screening"><ErrorBoundary><QuestionsTab questionType="pre_screening" /></ErrorBoundary></TabsContent>
        <TabsContent value="interview"><ErrorBoundary><QuestionsTab questionType="interview" /></ErrorBoundary></TabsContent>
        <TabsContent value="day_criteria"><ErrorBoundary><CriteriaTab /></ErrorBoundary></TabsContent>
        <TabsContent value="settings"><ErrorBoundary><SettingsTab /></ErrorBoundary></TabsContent>
        <TabsContent value="export"><ErrorBoundary><ExportTab /></ErrorBoundary></TabsContent>
      </Tabs>
    </div>
  );
}