import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Link as LinkIcon, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import StatusBadge from '@/components/ui/StatusBadge';
import ApprovalTimeline from '@/components/ui/ApprovalTimeline';
import ConceptForm from '@/components/forms/ConceptForm';
import StatusTimeline from '@/components/concept/StatusTimeline';
import { translateFieldName, translateValue, translateActionType } from '@/components/utils/hebrewTranslations';

export default function ConceptDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const conceptId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: concept, isLoading } = useQuery({
    queryKey: ['concept', conceptId],
    queryFn: () => base44.entities.Concept.filter({ id: conceptId }).then(res => res[0]),
    enabled: !!conceptId,
  });

  const { data: project } = useQuery({
    queryKey: ['project', concept?.project_id],
    queryFn: () => base44.entities.Project.filter({ id: concept.project_id }).then(res => res[0]),
    enabled: !!concept?.project_id,
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ['logs', conceptId],
    queryFn: () => base44.entities.ActivityLog.filter({ concept_id: conceptId }, '-created_date', 20),
    enabled: !!conceptId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const oldData = concept;
      await base44.entities.Concept.update(conceptId, data);
      
      // Log changes
      const changedFields = [];
      Object.keys(data).forEach(key => {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(data[key])) {
          changedFields.push({
            concept_id: conceptId,
            project_id: concept.project_id,
            action_type: key.includes('status') || key.includes('approval') ? 'status_changed' : 'updated',
            field_changed: key,
            old_value: String(oldData[key] || ''),
            new_value: String(data[key] || ''),
            user_name: user?.full_name || 'Unknown',
            user_email: user?.email || '',
          });
        }
      });
      
      if (changedFields.length > 0) {
        await base44.entities.ActivityLog.bulkCreate(changedFields);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['concept', conceptId]);
      queryClient.invalidateQueries(['logs', conceptId]);
      setShowEditForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Concept.delete(conceptId),
    onSuccess: () => {
      navigate(createPageUrl(`ProjectDetails?id=${concept.project_id}`));
    },
  });

  const handleApprovalStatusChange = async (newStatus) => {
    if (!isAdmin) return;
    await updateMutation.mutateAsync({ 
      approval_status: newStatus,
      rejection_reason: '',
      rejected_at_step: ''
    });
  };

  const handleSaveLink = async () => {
    await updateMutation.mutateAsync({ link: linkInput });
    setShowLinkDialog(false);
  };

  const handleDeleteLink = async () => {
    await updateMutation.mutateAsync({ link: '' });
    setShowLinkDialog(false);
    setLinkInput('');
  };

  const handleSaveNotes = async () => {
    await updateMutation.mutateAsync({ notes: notesInput });
    setEditingNotes(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8" dir="rtl">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-surface-2 rounded w-1/3"></div>
            <div className="h-64 bg-surface-2 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!concept) {
    return (
      <div className="min-h-screen p-8" dir="rtl">
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-text-secondary text-lg mb-4">קונספט לא נמצא</p>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline">חזרה לדשבורד</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isArticle = concept.type === 'article_interview';
  const workStatus = isArticle ? concept.work_status_article : concept.work_status_social;

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 text-sm mb-8">
          <Link to={createPageUrl('Dashboard')} className="text-text-muted hover:text-text-primary transition-colors">
            דשבורד
          </Link>
          <span className="text-slate-300">/</span>
          <Link to={createPageUrl(`ProjectDetails?id=${concept.project_id}`)} className="text-text-muted hover:text-text-primary transition-colors">
            {project?.name || 'פרויקט'}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-text-primary font-medium">{concept.name}</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-text-primary mb-3">{concept.name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={concept.type} type="concept" />
                {concept.domain && <StatusBadge status={concept.domain} type="domain" />}
                <StatusBadge status={workStatus || 'planning'} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditForm(true)}>
                עריכה
              </Button>
              {isAdmin && (
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteDialog(true)}>
                  מחיקה
                </Button>
              )}
            </div>
          </div>

          {/* Work Status Selector */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-text-primary block">סטטוס עבודה</Label>
                <StatusTimeline
                   isArticle={isArticle}
                   currentStatus={workStatus || 'planning'}
                   onStatusChange={async (value) => {
                     const updateData = isArticle
                       ? { work_status_article: value }
                       : { work_status_social: value };
                     await updateMutation.mutateAsync(updateData);
                   }}
                   isLoading={updateMutation.isPending}
                 />

                {/* Notes Section */}
                <div className="mt-6 pt-6 border-t border-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-primary">הערות</h3>
                    {!editingNotes && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingNotes(true)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-3">
                      <textarea
                        value={notesInput}
                        onChange={(e) => setNotesInput(e.target.value)}
                        placeholder="כתוב הערות..."
                        className="w-full p-3 border border-0 rounded-lg text-sm resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingNotes(false);
                            setNotesInput(concept?.notes || '');
                          }}
                        >
                          ביטול
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={updateMutation.isPending}
                          >
                          שמור
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text-secondary text-sm whitespace-pre-wrap leading-relaxed min-h-[60px]">
                      {concept?.notes || 'אין הערות'}
                    </p>
                  )}
                </div>
                </div>
                </CardContent>
                </Card>
                </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Concept Details Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 order-1">
            <Card>
              <CardContent className="p-8">

                {/* Details based on type */}
                  {isArticle ? (
                    <div className="space-y-6">
                      {concept.interviewees?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary mb-3">מרואיינים</h3>
                          <div className="flex flex-wrap gap-2">
                            {concept.interviewees.map((person, i) => (
                              <Badge key={i} variant="outline" className="bg-surface-2 border-0">{person}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {concept.media_outlet && (
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary mb-3">מערכת</h3>
                          <p className="text-text-secondary text-base">{concept.media_outlet}</p>
                        </div>
                      )}

                      <div>
                        <h3 className="text-sm font-semibold text-text-primary mb-3">צריך לתדרך</h3>
                        <Badge variant={concept.needs_briefing ? 'default' : 'outline'} className={concept.needs_briefing ? 'rounded-full bg-accent-primary text-white border-0' : 'rounded-full bg-surface-2 border-0'}>
                          {concept.needs_briefing ? 'כן' : 'לא'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {concept.content_type && (
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary mb-3">סוג תוכן</h3>
                          <StatusBadge status={concept.content_type} type="content" />
                        </div>
                      )}

                      {concept.draft_text && (
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary mb-3">טיוטה</h3>
                          <div className="whitespace-pre-wrap rounded-2xl bg-surface-2/50 p-6 text-base text-text-secondary">
                            {concept.draft_text}
                          </div>
                        </div>
                      )}

                      {concept.draft_images?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary mb-3">תמונות</h3>
                          <div className="grid grid-cols-3 gap-3">
                            {concept.draft_images.map((url, i) => (
                              <a key={i} href={url} target = "_blank" rel = "noopener noreferrer">
                                <img src={url} alt="" className="w-full aspect-square object-cover rounded-xl hover:opacity-80 transition-opacity border border-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {concept.partners?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary mb-3">שותפים</h3>
                          <div className="flex flex-wrap gap-2">
                            {concept.partners.map((partner, i) => (
                              <Badge key={i} variant="outline" className="bg-surface-2 border-0">{partner}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-text-primary">קישור</h3>
                      <div className="flex gap-2">
                        {concept.link && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={async () => {
                              await updateMutation.mutateAsync({ link: '' });
                            }}
                          >
                            <Trash2 className="w-4 h-4 ml-1" />
                            מחק
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setLinkInput(concept.link || '');
                            setShowLinkDialog(true);
                          }}
                        >
                          {concept.link ? (
                            <Edit className="w-4 h-4" />
                          ) : (
                            <>
                              <Plus className="w-4 h-4 ml-1" />
                              הוסף
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {concept.link && (
                      <a href={concept.link} target = "_blank" rel = "noopener noreferrer" className="text-accent-cyan hover:text-accent-cyan underline text-base break-all flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        {concept.link}
                      </a>
                    )}
                  </div>

                  {concept.details && (
                    <div className="mt-6 pt-6 border-t border-0">
                      <h3 className="text-sm font-semibold text-text-primary mb-3">פירוט</h3>
                      <p className="text-text-secondary text-base whitespace-pre-wrap leading-relaxed">{concept.details}</p>
                    </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Approval Timeline */}
          <div className="order-2">
            {isArticle && concept.domain && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card>
                  <CardHeader className="border-b border-0 pb-4">
                    <CardTitle className="text-xl font-bold text-text-primary">
                      ציר אישורים
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ApprovalTimeline
                      domain={concept.domain}
                      currentStatus={concept.approval_status}
                      isAdmin={isAdmin}
                      onStatusChange={handleApprovalStatusChange}
                      conceptId={conceptId}
                      rejectionReason={concept.rejection_reason}
                      rejectedAtStep={concept.rejected_at_step}
                    />
                    {!isAdmin && (
                      <p className="text-sm text-text-secondary mt-6 text-center bg-surface-2 p-3 rounded-lg">
                        רק מנהל יכול לשנות את סטטוס האישורים
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Activity Log */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 order-3">
            <Card>
              <CardHeader className="border-b border-0 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-text-primary">היסטוריית פעילות</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogsExpanded(!logsExpanded)}
                    className="flex items-center gap-2"
                  >
                    {logsExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>כווץ</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>הצג</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {logsExpanded && (
                <CardContent className="p-6">
                  {activityLogs.length === 0 ? (
                    <p className="text-text-muted text-center py-8">אין פעילות עדיין</p>
                  ) : (
                    <div className="space-y-5">
                      {activityLogs.map((log, index) => (
                        <div key={log.id} className="flex items-start gap-4">
                          <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-accent-primary"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text-primary font-medium">
                              {log.user_name}
                              <span className="font-normal text-text-secondary">
                                {' '}{translateActionType(log.action_type)}
                                {log.field_changed && ` את ${translateFieldName(log.field_changed)}`}
                              </span>
                            </p>
                            {log.old_value && log.new_value && (
                             <p className="text-text-secondary text-sm mt-1">
                               מ-"{translateValue(log.old_value)}" ל-"{translateValue(log.new_value)}"
                             </p>
                            )}
                            {log.details && (
                             <p className="text-orange-700 text-sm mt-1 font-medium">
                               {log.details}
                             </p>
                            )}
                            <p className="text-text-muted text-sm mt-1">
                             {format(new Date(log.created_date), 'dd/MM/yyyy בשעה HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </motion.div>

          {/* Meta Info */}
          <div className="order-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">נוצר</span>
                  <span className="text-sm font-medium text-text-primary">{format(new Date(concept.created_date), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">עודכן</span>
                  <span className="text-sm font-medium text-text-primary">{format(new Date(concept.updated_date), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-text-secondary">נוצר על ידי</span>
                  <span className="text-sm font-medium text-text-primary">{concept.created_by}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת קונספט</DialogTitle>
          </DialogHeader>
          <ConceptForm
            concept={concept}
            projectId={concept.project_id}
            onSubmit={(data) => updateMutation.mutate(data)}
            onCancel={() => setShowEditForm(false)}
            isLoading={updateMutation.isPending}
            isAdmin={isAdmin}
          />
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת קישור</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">קישור</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleSaveLink} disabled={updateMutation.isPending}>
              שמור
            </Button>
            {concept.link && (
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDeleteLink}
                disabled={updateMutation.isPending}
              >
                מחק קישור
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת קונספט</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הקונספט"{concept.name}"?
              פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}