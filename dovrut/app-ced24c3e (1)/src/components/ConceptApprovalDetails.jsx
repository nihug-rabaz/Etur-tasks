import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

const approvalStepNames = {
  'waiting_branch_head': 'רמ״ח',
  'waiting_deputy_commander': 'רמ״ט',
  'waiting_chief_rabbi': 'רבצ״ר',
  'approved': 'אושר'
};

const typeNames = {
  'article_interview': 'כתבה/ראיון',
  'social_media': 'רשתות חברתיות'
};

export default function ConceptApprovalDetails({ concept, project, onReset }) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('updateConceptApproval', { 
        conceptId: concept.id, 
        action: 'approve',
        approvalStep: concept.approval_status
      });
      return response.data;
    },
    onSuccess: () => {
      setActionResult({ type: 'success', message: 'הקונספט אושר בהצלחה!' });
      setTimeout(() => {
        setRejectionReason('');
        setShowRejectForm(false);
        setActionResult(null);
        onReset();
      }, 1500);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('updateConceptApproval', { 
        conceptId: concept.id, 
        action: 'reject',
        approvalStep: concept.approval_status,
        rejectionReason: rejectionReason
      });
      return response.data;
    },
    onSuccess: () => {
      setActionResult({ type: 'reject', message: 'הקונספט נדחה והוחזר לתחילת תהליך האישורים' });
      setShowRejectForm(false);
      setRejectionReason('');
      setTimeout(() => {
        setActionResult(null);
        onReset();
      }, 1500);
    },
  });

  return (
    <div className="min-h-screen bg-white p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 rounded-full p-3">
              <FileText className="w-6 h-6 text-slate-700" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">אישור פרויקטים</h1>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>

        {/* Top Info Bar */}
        <div className="bg-yellow-100 rounded-full px-6 py-3 mb-6 inline-block">
          <p className="text-yellow-900 font-medium text-sm">
            {project?.name} + {concept.approval_status !== 'approved' ? approvalStepNames[concept.approval_status] : 'אושר'}
          </p>
        </div>

        {/* Status Bar */}
        <div className="bg-blue-50 rounded-2xl px-3 py-2 mb-6 text-right w-fit">
          <p className="text-blue-900 font-medium">
            {concept.approval_status !== 'approved' ? approvalStepNames[concept.approval_status] : 'אושר'} — למאשר בעניין
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Concept Details (2 columns) */}
          <Card className="border-0 bg-slate-50 shadow-md lg:col-span-2">
            <CardContent className="p-6">
              <h3 className="text-slate-900 font-semibold mb-6 text-lg text-right">{concept.name}</h3>
              
              {/* Main Details */}
              <div className="space-y-6">
                {/* Details Section */}
                {concept.details && (
                  <div>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                      {concept.details}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                  {concept.media_outlet && (
                    <Badge className="bg-yellow-100 text-yellow-900">{concept.media_outlet}</Badge>
                  )}
                  {concept.type && (
                    <Badge className="bg-purple-100 text-purple-900">{typeNames[concept.type]}</Badge>
                  )}
                  <Badge className="bg-yellow-100 text-yellow-900">
                    צריך לתדרך: {concept.needs_briefing ? 'כן' : 'לא'}
                  </Badge>
                </div>

                {/* Metadata Grid */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white rounded p-3 border border-slate-200">
                      <p className="text-slate-600 text-xs mb-1">משרה:</p>
                      <p className="text-slate-900 font-medium">{concept.media_outlet || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded p-3 border border-slate-200">
                      <p className="text-slate-600 text-xs mb-1">צריך לתדרך:</p>
                      <p className="text-slate-900 font-medium">{concept.needs_briefing ? 'כן' : 'לא'}</p>
                    </div>
                    <div className="bg-white rounded p-3 border border-slate-200">
                      <p className="text-slate-600 text-xs mb-1">נוצר ב:</p>
                      <p className="text-slate-900 font-medium">{format(new Date(concept.created_date), 'dd/MM/yyyy')}</p>
                    </div>
                    <div className="bg-white rounded p-3 border border-slate-200">
                      <p className="text-slate-600 text-xs mb-1">נוצר על ידי:</p>
                      <p className="text-slate-900 font-medium text-xs truncate">{concept.created_by}</p>
                    </div>
                  </div>

                  {/* Creator Info */}
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-slate-600 text-xs mb-1">שעה:</p>
                    <p className="text-slate-900 font-medium text-sm">{format(new Date(concept.created_date), 'HH:mm')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Approval Actions (1 column) */}
          <Card className="border-0 bg-slate-50 shadow-md h-fit">
            <CardContent className="p-4">
              <h3 className="text-slate-900 font-semibold mb-3 text-center text-sm">פעולות אישור</h3>
              
              {!showRejectForm ? (
                <div className="space-y-1.5">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-9 rounded-lg font-medium text-sm"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    אשר ✓
                  </Button>
                  <Button
                    className="w-full bg-red-500 hover:bg-red-600 text-white h-9 rounded-lg font-medium text-sm"
                    onClick={() => setShowRejectForm(true)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    דחה ✕
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 min-h-[70px] placeholder-slate-400 text-sm"
                    placeholder="הסבר את סיבת הדחייה..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <Button
                    className="w-full bg-red-500 hover:bg-red-600 text-white h-8 rounded-lg text-xs"
                    onClick={() => rejectMutation.mutate()}
                    disabled={approveMutation.isPending || rejectMutation.isPending || !rejectionReason.trim()}
                  >
                    אשר דחייה
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-slate-700 border-slate-300 h-8 rounded-lg text-xs"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                  >
                    ביטול
                  </Button>
                </div>
              )}
              <p className="text-xs text-slate-600 mt-2 text-center">
                דחיה תחזיר לתחילת התהליך
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Result */}
        {actionResult && (
          <div className={`mt-6 rounded-lg p-4 text-center ${actionResult.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-orange-50 text-orange-800 border border-orange-200'}`}>
            {actionResult.message}
          </div>
        )}
      </div>
    </div>
  );
}