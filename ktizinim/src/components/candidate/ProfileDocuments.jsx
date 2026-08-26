import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Download, User } from 'lucide-react';

// Read-only document list with download links, uploader name, and date.
export default function ProfileDocuments({ cid }) {
  const [docs, setDocs] = useState(null);

  useEffect(() => {
    base44.entities.CandidateDocument.filter({ candidate_id: cid })
      .then((d) => setDocs(d.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))))
      .catch(() => setDocs([]));
  }, [cid]);

  if (!docs) return <div className="text-center py-6 text-slate-400">טוען מסמכים...</div>;
  if (!docs.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold">מסמכים ({docs.length})</h2>
      {docs.map((d) => (
        <div key={d.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{d.name}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                {d.uploaded_by_name || '—'} · {new Date(d.created_date).toLocaleDateString('he-IL')}
              </div>
            </div>
          </div>
          <a href={d.file_url} target="_blank" rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition shrink-0">
            <Download className="w-4 h-4" />
          </a>
        </div>
      ))}
    </div>
  );
}