import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Calendar, Globe } from 'lucide-react';
import { format } from 'date-fns';

export default function NewsArticleCard({ article }) {
  let publishedDate = null;
  try {
    if (article.publishedAt) {
      const d = new Date(article.publishedAt);
      if (!isNaN(d.getTime())) publishedDate = format(d, 'dd/MM/yyyy');
    }
  } catch (e) {
  }

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-[0_16px_40px_rgba(22,24,29,0.12)]">
      <div className="h-1.5 w-full bg-gradient-to-l from-accent-cyan to-accent-primary" />
      <CardContent className="p-6">
        <div className="flex gap-4">
          {article.imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={article.imageUrl}
                alt=""
                className="h-24 w-24 rounded-2xl object-cover"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <h3 className="mb-2 line-clamp-2 text-lg font-bold text-text-primary transition-colors group-hover:text-accent-primary">
                {article.title}
              </h3>
            </a>

            <p className="mb-3 line-clamp-2 text-sm text-text-secondary">
              {article.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-text-muted">
              {article.source && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span>{article.source}</span>
                </div>
              )}

              {publishedDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{publishedDate}</span>
                </div>
              )}

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-auto flex items-center gap-1 transition-colors hover:text-accent-primary"
              >
                <span>קרא עוד</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
