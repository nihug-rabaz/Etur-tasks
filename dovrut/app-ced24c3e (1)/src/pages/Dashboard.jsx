import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Folder, FileText, Plus, Search, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AnimatePresence } from 'framer-motion';
import ProjectCard from '@/components/projects/ProjectCard';
import ConceptCard from '@/components/concepts/ConceptCard';
import ProjectForm from '@/components/forms/ProjectForm';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedProject, setExpandedProject] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: projects = [], isLoading: loadingProjects, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: concepts = [], isLoading: loadingConcepts } = useQuery({
    queryKey: ['concepts'],
    queryFn: () => base44.entities.Concept.list('-created_date'),
  });

  const handleCreateProject = async (data) => {
    await base44.entities.Project.create(data);
    await refetchProjects();
    setShowProjectForm(false);
  };

  const getConceptsForProject = (projectId) => concepts.filter(c => c.project_id === projectId);

  // Stats
  const totalProjects = projects.length;
  const totalConcepts = concepts.length;
  const waitingApproval = concepts.filter(c => 
    c.type === 'article_interview' && 
    c.approval_status && 
    c.approval_status !== 'approved'
  ).length;
  const publishedConcepts = concepts.filter(c => 
    c.work_status_article === 'published' || c.work_status_social === 'published'
  ).length;

  // Filtered data
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const recentConcepts = concepts
    .filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || c.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .slice(0, 6);

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-text-primary">דשבורד דוברות</h1>
            <p className="text-text-secondary mt-1 text-sm">ניהול פרויקטים וקונספטים במקום אחד</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowProjectForm(true)}>
              <Plus className="ml-2 h-4 w-4" />
              פרויקט חדש
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="transition-shadow hover:shadow-[0_16px_40px_rgba(22,24,29,0.12)]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-accent-cyan/15">
                  <Folder className="w-5 h-5 text-accent-cyan" />
                </div>
                <div>
                  <p className="text-xs text-text-muted font-medium">פרויקטים</p>
                  <p className="text-2xl font-black text-text-primary">{totalProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-[0_16px_40px_rgba(22,24,29,0.12)]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-accent-primary/15">
                  <FileText className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <p className="text-xs text-text-muted font-medium">קונספטים</p>
                  <p className="text-2xl font-black text-text-primary">{totalConcepts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-[0_16px_40px_rgba(22,24,29,0.12)]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-accent-orange/15">
                  <Clock className="w-5 h-5 text-accent-orange" />
                </div>
                <div>
                  <p className="text-xs text-text-muted font-medium">ממתינים</p>
                  <p className="text-2xl font-black text-text-primary">{waitingApproval}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-[0_16px_40px_rgba(22,24,29,0.12)]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-success/15">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-text-muted font-medium">פורסמו</p>
                  <p className="text-2xl font-black text-text-primary">{publishedConcepts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  placeholder="חיפוש..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 border-0"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 border-0">
                  <SelectValue placeholder="סטטוס פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="completed">הסתיים</SelectItem>
                  <SelectItem value="on_hold">בהשהיה</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-44 border-0">
                  <SelectValue placeholder="סוג קונספט" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="article_interview">כתבה / ראיון</SelectItem>
                  <SelectItem value="social_media">רשתות חברתיות</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-surface-2">
                <Folder className="w-5 h-5 text-text-secondary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">פרויקטים</h2>
                <p className="text-xs text-text-muted">כל הפרויקטים הפעילים במערכת</p>
              </div>
            </div>
            <Link to={createPageUrl('Projects')} className="text-sm text-accent-cyan hover:text-accent-cyan font-medium flex items-center gap-1">
              כל הפרויקטים
              <span>←</span>
            </Link>
          </div>
          
          {loadingProjects ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-surface-2 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-surface-2 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="border-2 border-dashed border-border-strong">
              <CardContent className="p-12 text-center">
                <div className="p-4 rounded-full bg-surface-2 w-fit mx-auto mb-4">
                  <Folder className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-text-muted font-medium mb-1">אין פרויקטים</p>
                <p className="text-sm text-text-muted">לא נמצאו פרויקטים התואמים את החיפוש</p>
                {isAdmin && (
                  <Button variant="outline" className="mt-6" onClick={() => setShowProjectForm(true)}>
                    <Plus className="w-4 h-4 ml-2" />
                    צור פרויקט ראשון
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence>
                {filteredProjects.slice(0, 6).map((project, index) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    conceptsCount={getConceptsForProject(project.id).length}
                    concepts={getConceptsForProject(project.id)}
                    isExpanded={expandedProject === project.id}
                    onToggleExpand={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Recent Concepts */}
        <div className="border-t-2 border-transparent pt-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-accent-primary/15">
                <FileText className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">קונספטים אחרונים</h2>
                <p className="text-xs text-text-muted">קונספטים שנוצרו לאחרונה תחת הפרויקטים</p>
              </div>
            </div>
            <Link to={createPageUrl('Concepts')} className="text-sm text-accent-primary hover:text-accent-primary font-medium flex items-center gap-1">
              כל הקונספטים
              <span>←</span>
            </Link>
          </div>
          
          {loadingConcepts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5">
                    <div className="h-4 bg-surface-2 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-surface-2 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentConcepts.length === 0 ? (
            <Card className="border-2 border-dashed border-border-strong">
              <CardContent className="p-12 text-center">
                <div className="p-4 rounded-full bg-accent-primary/15 w-fit mx-auto mb-4">
                  <FileText className="w-8 h-8 text-accent-primary" />
                </div>
                <p className="text-text-muted font-medium mb-1">אין קונספטים</p>
                <p className="text-sm text-text-muted">צור פרויקט והוסף קונספטים כדי להתחיל</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence>
                {recentConcepts.map((concept) => {
                  const project = projects.find(p => p.id === concept.project_id);
                  return (
                    <div key={concept.id} className="relative">
                      {project && (
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Folder className="w-3.5 h-3.5" />
                            <span className="font-medium">{project.name}</span>
                          </div>
                        </div>
                      )}
                      <ConceptCard concept={concept} />
                    </div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>יצירת פרויקט חדש</DialogTitle>
          </DialogHeader>
          <ProjectForm
            onSubmit={handleCreateProject}
            onCancel={() => setShowProjectForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}