import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AnimatePresence } from 'framer-motion';
import ConceptCard from '@/components/concepts/ConceptCard';

export default function Concepts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: concepts = [], isLoading } = useQuery({
    queryKey: ['concepts'],
    queryFn: () => base44.entities.Concept.list('-created_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'לא משויך';
  };

  const filteredConcepts = concepts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    const matchesProject = projectFilter === 'all' || c.project_id === projectFilter;
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const workStatus = c.type === 'article_interview' ? c.work_status_article : c.work_status_social;
      matchesStatus = workStatus === statusFilter;
    }
    
    return matchesSearch && matchesType && matchesProject && matchesStatus;
  });

  return (
    <div className="page-shell" dir="rtl">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Dashboard')} className="text-text-muted hover:text-text-secondary">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-text-primary">קונספטים</h1>
            <p className="text-text-muted text-sm">{filteredConcepts.length} קונספטים</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <Input
              placeholder="חיפוש קונספטים..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="סוג קונספט" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסוגים</SelectItem>
              <SelectItem value="article_interview">כתבה / ראיון</SelectItem>
              <SelectItem value="social_media">רשתות חברתיות</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="פרויקט" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הפרויקטים</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="סטטוס עבודה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="planning">בתכנון</SelectItem>
              <SelectItem value="production">בהפקה</SelectItem>
              <SelectItem value="waiting_approvals">מחכה לאישורים</SelectItem>
              <SelectItem value="waiting_publish">ממתין לפרסום</SelectItem>
              <SelectItem value="published">פורסם</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Concepts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="h-4 bg-surface-2 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-surface-2 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredConcepts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-16 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-text-muted text-lg">אין קונספטים להצגה</p>
              <p className="text-text-muted text-sm mt-2">נסה לשנות את הסינון או ליצור קונספט חדש מתוך פרויקט</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredConcepts.map((concept) => (
                <div key={concept.id}>
                  <div className="text-xs text-text-muted mb-2 flex items-center gap-1">
                    <span>פרויקט:</span>
                    <Link 
                      to={createPageUrl(`ProjectDetails?id=${concept.project_id}`)}
                      className="text-accent-cyan hover:underline"
                    >
                      {getProjectName(concept.project_id)}
                    </Link>
                  </div>
                  <ConceptCard concept={concept} />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}