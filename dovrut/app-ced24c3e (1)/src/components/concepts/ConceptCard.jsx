import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { motion } from 'framer-motion';

export default function ConceptCard({ concept }) {
  const isArticle = concept.type === 'article_interview';
  const workStatus = isArticle ? concept.work_status_article : concept.work_status_social;
  const accent = isArticle ? 'bg-accent-cyan' : 'bg-accent-orange';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={createPageUrl(`ConceptDetails?id=${concept.id}`)}>
        <Card className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-[0_16px_40px_rgba(22,24,29,0.12)]">
          <div className={`h-1.5 w-full ${accent}`} />
          <CardContent className="p-5">
            <div className="space-y-3">
              <div>
                <h4 className="line-clamp-2 text-lg font-bold text-text-primary transition-colors group-hover:text-accent-primary">
                  {concept.name}
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={concept.type} type="concept" />
                <StatusBadge status={workStatus || 'planning'} />
                {!isArticle && concept.content_type && (
                  <StatusBadge status={concept.content_type} type="content" />
                )}
              </div>

              {isArticle && concept.approval_status && (
                <div className="space-y-2 border-t border-transparent pt-3">
                  <StatusBadge status={concept.approval_status} />
                  {concept.rejection_reason && (
                    <div className="flex items-start gap-2 rounded-2xl bg-accent-orange/10 p-2.5">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-orange" />
                      <div className="text-xs text-accent-orange">
                        <span className="font-semibold">נדחה:</span> {concept.rejection_reason}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
