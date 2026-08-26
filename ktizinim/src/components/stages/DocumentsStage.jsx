import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Download, Trash2, FileText, Eye, Pencil, Check, X } from 'lucide-react';
import { addTimelineEvent } from '@/lib/timeline';
import { DOC_TYPES, SOURCE_LABELS, ACCEPTED_FILE_TYPES } from '@/lib/documentTypes';

export default function DocumentsStage({ cid }) {
  const { user } = useAuth();
  const { isAdmin, isRamad } = useUserRole();
  const source = isAdmin ? 'admin' : isRamad ? 'ramad' : 'evaluator';

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('');
  const [customType, setCustomType] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNotes, setEditNotes] = useState('');

  const load = () => {
    base44.entities.CandidateDocument.filter({ candidate_id: cid })
      .then((d) => {
        setDocs(d.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(load, [cid]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!docType || (docType === 'מסמך אחר' && !customType.trim())) {
      alert('יש לבחור סוג מסמך לפני ההעלאה');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const typeName = docType === 'מסמך אחר' ? customType.trim() : docType;
      await base44.entities.CandidateDocument.create({
        candidate_id: cid,
        name: file.name,
        file_url,
        document_type: typeName,
        upload_source: source,
        uploaded_by_name: user?.full_name || 'משתמש',
      });
      await addTimelineEvent({
        candidate_id: cid,
        event_type: 'document',
        title: `הועלה מסמך: ${typeName}`,
        description: file.name,
        actor_name: user?.full_name,
        stage_key: 'documents',
      });
      setDocType('');
      setCustomType('');
      load();
    } catch {
      alert('שגיאה בהעלאת המסמך');
    }
    setUploading(false);
    e.target.value = '';
  };

  const deleteDoc = async (d) => {
    if (!window.confirm(`האם למחוק את "${d.name}"?`)) return;
    await base44.entities.CandidateDocument.delete(d.id);
    load();
  };

  const saveNotes = async (d) => {
    await base44.entities.CandidateDocument.update(d.id, { notes: editNotes });
    setEditId(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold">מסמכי המועמד</h2>
            <p className="text-xs text-slate-400 mt-0.5">העלאה, צפייה, הורדה ומחיקה של מסמכים</p>
          </div>
          <label className="cursor-pointer">
            <input type="file" className="hidden" accept={ACCEPTED_FILE_TYPES} onChange={handleUpload} disabled={uploading} />
            <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 h-9 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              <Upload className="w-4 h-4" /> {uploading ? 'מעלה...' : 'העלאת מסמך'}
            </span>
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">סוג מסמך להעלאה</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-input rounded-md px-3 py-1.5 text-sm bg-white"
            >
              <option value="">בחר סוג מסמך...</option>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {docType === 'מסמך אחר' && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">שם המסמך</label>
              <input
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-1.5 text-sm"
                placeholder="הקלד שם מסמך..."
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">טוען...</div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          אין מסמכים עדיין
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{d.name}</div>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {d.document_type && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{d.document_type}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(d.created_date).toLocaleDateString('he-IL')}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">
                    {SOURCE_LABELS[d.upload_source] || d.upload_source || '—'}
                    {d.uploaded_by_name ? ` (${d.uploaded_by_name})` : ''}
                  </span>
                </div>
                {editId === d.id ? (
                  <div className="mt-2 flex gap-2">
                    <Textarea rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="הערות" className="text-sm" />
                    <div className="flex flex-col gap-1">
                      <Button size="icon" className="w-8 h-8" onClick={() => saveNotes(d)}><Check className="w-4 h-4" /></Button>
                      <Button size="icon" variant="outline" className="w-8 h-8" onClick={() => setEditId(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  d.notes && <div className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg p-2">{d.notes}</div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <a href={d.file_url} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost" className="w-8 h-8" title="צפייה"><Eye className="w-4 h-4" /></Button></a>
                <a href={d.file_url} download><Button size="icon" variant="ghost" className="w-8 h-8" title="הורדה"><Download className="w-4 h-4" /></Button></a>
                <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => { setEditId(d.id); setEditNotes(d.notes || ''); }} title="ערוך הערה"><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="w-8 h-8 text-rose-500" onClick={() => deleteDoc(d)} title="מחק"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}