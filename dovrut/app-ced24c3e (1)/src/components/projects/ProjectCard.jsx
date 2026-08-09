import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronDown, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ProjectCard({ project, conceptsCount = 0, concepts = [], isExpanded = false, onToggleExpand }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden transition-shadow hover:shadow-[0_16px_40px_rgba(22,24,29,0.12)]">
        <div className="h-1.5 w-full bg-gradient-to-l from-accent-primary to-accent-cyan" />
        <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)} className="group flex-1">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-text-primary transition-colors group-hover:text-accent-primary">
                      {project.name}
                    </h3>
                    <p className="text-sm text-text-muted">
                      {format(new Date(project.created_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </Link>
                {conceptsCount > 0 && (
                  <CollapsibleTrigger asChild>
                    <button
                      className="flex-shrink-0 rounded-full bg-surface-2 p-2 transition-colors hover:bg-accent-primary/12"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-5 w-5 text-text-secondary" />
                      </motion.div>
                    </button>
                  </CollapsibleTrigger>
                )}
              </div>

              {project.description && (
                <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)}>
                  <p className="line-clamp-2 text-sm text-text-secondary">{project.description}</p>
                </Link>
              )}

              <div className="flex items-center justify-between border-t border-transparent pt-2">
                <StatusBadge status={project.status || 'active'} />
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>{conceptsCount} קונספטים</span>
                  {project.target_audiences?.length > 0 && (
                    <span>{project.target_audiences.length} קהלי יעד</span>
                  )}
                </div>
              </div>

              <CollapsibleContent>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height:"auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 border-t border-transparent pt-4"
                    >
                      <div className="space-y-2">
                        <div className="mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-text-muted" />
                          <h4 className="text-sm font-semibold text-text-secondary">קונספטים בפרויקט</h4>
                        </div>
                        {concepts.length === 0 ? (
                          <p className="py-2 text-sm text-text-muted">אין קונספטים בפרויקט</p>
                        ) : (
                          <div className="space-y-2">
                            {concepts.map((concept) => (
                              <Link
                                key={concept.id}
                                to={createPageUrl(`ConceptDetails?id=${concept.id}`)}
                                className="block"
                              >
                                <div className="group rounded-2xl bg-surface-2/80 p-3 transition-colors hover:bg-accent-primary/10">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-text-primary group-hover:text-accent-primary">
                                        {concept.name}
                                      </p>
                                      <div className="mt-1 flex items-center gap-2">
                                        <Badge variant="outline" className="rounded-full border-0 bg-surface-1 text-xs font-semibold text-text-secondary">
                                          {concept.type === 'article_interview' ? 'כתבה/ראיון' : 'רשתות חברתיות'}
                                        </Badge>
                                        {concept.approval_status && (
                                          <span className="text-xs text-text-muted">
                                            {concept.approval_status === 'approved' ? '✓ אושר' : 'ממתין לאישור'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <ChevronLeft className="h-4 w-4 flex-shrink-0 text-text-muted group-hover:text-accent-primary" />
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CollapsibleContent>
            </div>
          </CardContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
}
