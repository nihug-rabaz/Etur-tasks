import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Edit, Trash2, Plus, Users, Calendar, FileText, Share2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import ProjectForm from '@/components/forms/ProjectForm';
import ConceptForm from '@/components/forms/ConceptForm';
import ConceptCard from '@/components/concepts/ConceptCard';

export default function ProjectDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showConceptForm, setShowConceptForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then(res => res[0]),
    enabled: !!projectId,
  });

  const { data: concepts = [] } = useQuery({
    queryKey: ['concepts', projectId],
    queryFn: () => base44.entities.Concept.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['project', projectId]);
      setShowEditForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Project.delete(projectId),
    onSuccess: () => {
      navigate(createPageUrl('Projects'));
    },
  });

  const createConceptMutation = useMutation({
    mutationFn: (data) => base44.entities.Concept.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['concepts', projectId]);
      setShowConceptForm(false);
    },
  });

  const filteredConcepts = concepts.filter(c => {
    if (activeTab === 'all') return true;
    return c.type === activeTab;
  });

  const articleCount = concepts.filter(c => c.type === 'article_interview').length;
  const socialCount = concepts.filter(c => c.type === 'social_media').length;

  if (isLoading) {
    return (
      <div className="page-shell p-8" dir="rtl">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-surface-2 rounded w-1/4"></div>
            <div className="h-40 bg-surface-2 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page-shell p-8" dir="rtl">
        <div className="max-w-5xl mx-auto text-center py-16">
          <p className="text-text-muted">פרויקט לא נמצא</p>
          <Link to={createPageUrl('Projects')}>
            <Button variant="outline" className="mt-4">חזרה לפרויקטים</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link to={createPageUrl('Projects')} className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            <span>פרויקטים</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-text-secondary font-medium">{project.name}</span>
        </div>

        {/* Project Header Card */}
        <Card className="border border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-accent-cyan/15 flex-shrink-0">
                    <FileText className="w-6 h-6 text-accent-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-black text-text-primary">{project.name}</h1>
                      <StatusBadge status={project.status || 'active'} />
                    </div>
                    {project.description && (
                      <p className="text-text-secondary leading-relaxed">{project.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="p-1.5 rounded-md bg-surface-2">
                      <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                    </div>
                    <span className="text-text-secondary">נוצר {format(new Date(project.created_date), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="p-1.5 rounded-md bg-surface-2">
                      <FileText className="w-3.5 h-3.5 text-text-secondary" />
                    </div>
                    <span className="text-text-secondary"><span className="font-semibold text-text-primary">{concepts.length}</span> קונספטים</span>
                  </div>
                </div>

                {project.target_audiences?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">קהלי יעד:</span>
                    </div>
                    {project.target_audiences.map((audience, i) => (
                      <Badge key={i} variant="secondary" className="bg-surface-2 text-text-secondary border-0">
                        {audience}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)} className="border-0">
                    <Edit className="w-4 h-4 ml-1" />
                    עריכה
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-0" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Concepts Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">קונספטים בפרויקט</h2>
            <p className="text-sm text-text-muted mt-0.5">כל הקונספטים המשויכים לפרויקט זה</p>
          </div>
          <Button onClick={() => setShowConceptForm(true)} >
            <Plus className="w-4 h-4 ml-2" />
            קונספט חדש
          </Button>
        </div>

        {/* Tabs */}
        <Card className="border border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-surface-2 border border-0">
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  הכל ({concepts.length})
                </TabsTrigger>
                <TabsTrigger value="article_interview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <FileText className="w-4 h-4 ml-1" />
                  כתבות ({articleCount})
                </TabsTrigger>
                <TabsTrigger value="social_media" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Share2 className="w-4 h-4 ml-1" />
                  רשתות ({socialCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Concepts Grid */}
        {filteredConcepts.length === 0 ? (
          <Card className="border-2 border-dashed border-border-strong">
            <CardContent className="p-12 text-center">
              <div className="p-4 rounded-full bg-surface-2 w-fit mx-auto mb-4">
                <FileText className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-text-secondary font-medium mb-1">אין קונספטים עדיין</p>
              <p className="text-sm text-text-muted mb-6">צור את הקונספט הראשון בפרויקט זה</p>
              <Button onClick={() => setShowConceptForm(true)} >
                <Plus className="w-4 h-4 ml-2" />
                צור קונספט ראשון
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredConcepts.map((concept) => (
              <ConceptCard key={concept.id} concept={concept} />
            ))}
          </div>
        )}
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת פרויקט</DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={project}
            onSubmit={(data) => updateMutation.mutate(data)}
            onCancel={() => setShowEditForm(false)}
            isLoading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Create Concept Dialog */}
      <Dialog open={showConceptForm} onOpenChange={setShowConceptForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>יצירת קונספט חדש</DialogTitle>
          </DialogHeader>
          <ConceptForm
            projectId={projectId}
            onSubmit={(data) => createConceptMutation.mutate(data)}
            onCancel={() => setShowConceptForm(false)}
            isLoading={createConceptMutation.isPending}
            isAdmin={isAdmin}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת פרויקט</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הפרויקט"{project.name}"?
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