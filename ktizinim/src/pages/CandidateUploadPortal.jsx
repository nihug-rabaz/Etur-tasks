import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Upload, CheckCircle } from 'lucide-react';
import { DOC_TYPES, ACCEPTED_FILE_TYPES } from '@/lib/documentTypes';
import { addTimelineEvent } from '@/lib/timeline';

export default function CandidateUploadPortal() {
  const [stage, setStage] = useState('verify');
  const [candidate, setCandidate] = useState(null);
  const [pn, setPn] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [docType, setDocType] = useState('');
  const [customType, setCustomType] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError('');
    try {
      const results = await base44.entities.Candidate.filter({
        personal_number: pn.trim(),
        phone: phone.trim(),
      });
      if (results && results.length > 0) {
        setCandidate(results[0]);
        setStage('portal');
      } else {
        setError('הנתונים שהוזנו אינם תואמים לרישומי המערכת. אנא בדוק את הפרטים ונסה שוב.');
      }
    } catch {
      setError('שגיאה באימות. אנא נסה שוב מאוחר יותר.');
    }
    setVerifying(false);
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!file || !docType) return;
    if (docType === 'מסמך אחר' && !customType.trim()) return;
    setUploading(true);
    setSuccess(false);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const typeName = docType === 'מסמך אחר' ? customType.trim() : docType;
      await base44.entities.CandidateDocument.create({
        candidate_id: candidate.id,
        name: file.name,
        file_url,
        document_type: typeName,
        upload_source: 'candidate',
        uploaded_by_name: candidate.full_name,
      });
      await addTimelineEvent({
        candidate_id: candidate.id,
        event_type: 'document',
        title: `הועלה מסמך: ${typeName}`,
        description: file.name,
        actor_name: candidate.full_name,
        stage_key: 'documents',
      });
      setSuccess(true);
      setFile(null);
      setDocType('');
      setCustomType('');
      const input = document.getElementById('portal-file');
      if (input) input.value = '';
    } catch {
      alert('שגיאה בהעלאת המסמך. אנא נסה שוב.');
    }
    setUploading(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-primary/5 to-white py-10 px-4 font-body">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold text-primary">פורטל מועמדים — העלאת מסמכים</h1>
        </div>

        {stage === 'verify' && (
          <form onSubmit={verify} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-5">
            <div>
              <label className="font-medium text-sm block mb-2">מספר אישי</label>
              <input
                value={pn}
                onChange={(e) => setPn(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="font-medium text-sm block mb-2">מספר טלפון</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            {error && (
              <p className="text-rose-600 text-sm bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>
            )}
            <button
              type="submit"
              disabled={verifying}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium disabled:opacity-50 hover:bg-primary/90 transition"
            >
              {verifying ? 'מאמת...' : 'כניסה'}
            </button>
          </form>
        )}

        {stage === 'portal' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="font-display text-lg font-bold">העלאת מסמכים לתיק המועמד</h2>
              <div className="mt-3 flex items-center justify-between text-sm flex-wrap gap-2">
                <span className="font-medium">{candidate.full_name}</span>
                <span className="text-slate-500">מספר אישי: {candidate.personal_number}</span>
              </div>
            </div>

            <form onSubmit={upload} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
              <div>
                <label className="font-medium text-sm block mb-2">סוג המסמך</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                >
                  <option value="">בחר סוג מסמך...</option>
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {docType === 'מסמך אחר' && (
                <div>
                  <label className="font-medium text-sm block mb-2">שם המסמך</label>
                  <input
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>
              )}

              <div>
                <label className="font-medium text-sm block mb-2">קובץ</label>
                <input
                  id="portal-file"
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">פורמטים נתמכים: PDF, DOC/DOCX, XLS/XLSX, JPG, PNG</p>
              </div>

              <button
                type="submit"
                disabled={uploading || !file || !docType}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'מעלה...' : 'העלאת מסמך'}
              </button>
            </form>

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                <p className="text-emerald-800 text-sm font-medium">
                  המסמך הועלה בהצלחה ונשמר בתיקך. תודה.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}