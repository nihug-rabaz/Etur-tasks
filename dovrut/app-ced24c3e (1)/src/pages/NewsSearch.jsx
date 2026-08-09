import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Newspaper } from 'lucide-react';
import NewsArticleCard from '@/components/news/NewsArticleCard';
import { motion } from 'framer-motion';

export default function NewsSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStart, setCurrentStart] = useState(1);

  const handleSearch = async (start = 1) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        q: searchQuery,
        dateFilter,
        start: start.toString(),
      };

      if (dateFilter === 'custom' && startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }

      const response = await base44.functions.invoke('searchNews', payload);
      
      if (response.data.error) {
        setError(response.data.error);
        setResults(null);
      } else {
        setResults(response.data);
        setCurrentStart(start);
      }
    } catch (err) {
      setError('שגיאה בחיפוש. אנא נסה שוב.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (results?.hasNextPage && results?.nextStartIndex) {
      handleSearch(results.nextStartIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentStart > 1) {
      const prevStart = Math.max(1, currentStart - 10);
      handleSearch(prevStart);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Newspaper className="w-8 h-8 text-text-primary" />
            <h1 className="text-4xl font-bold text-text-primary">חיפוש חדשות</h1>
          </div>
          <p className="text-text-secondary">חפש חדשות ישראליות מאתרי חדשות מובילים</p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="p-6 space-y-4">
            {/* Search Input */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="הקלד מונח לחיפוש..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="rounded-2xl bg-surface-2/50 border-0 text-lg h-12"
                />
              </div>
              <Button 
                onClick={() => handleSearch()} 
                disabled={loading || !searchQuery.trim()}
                className="h-12 px-6"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 ml-2" />
                    חפש
                  </>
                )}
              </Button>
            </div>

            {/* Date Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="rounded-2xl bg-surface-2/50 border-0">
                    <SelectValue placeholder="טווח תאריכים" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-1">
                    <SelectItem value="all">כל התקופה</SelectItem>
                    <SelectItem value="day">24 שעות אחרונות</SelectItem>
                    <SelectItem value="week">7 ימים אחרונים</SelectItem>
                    <SelectItem value="lastWeek">שבוע אחרון</SelectItem>
                    <SelectItem value="month">חודש אחרון</SelectItem>
                    <SelectItem value="year">שנה אחרונה</SelectItem>
                    <SelectItem value="custom">טווח מותאם אישית</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilter === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-2xl bg-surface-2/50 border-0"
                    placeholder="מתאריך"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-2xl bg-surface-2/50 border-0"
                    placeholder="עד תאריך"
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="p-6 text-center text-red-700">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && (
          <>
            {/* Results Info */}
            <div className="mb-6 text-text-secondary">
              {results.articles.length > 0 ? (
                <p>
                  נמצאו {results.totalResults.toLocaleString()} תוצאות עבור"{results.query}"
                  {' '}(עמוד {Math.ceil(currentStart / 10)})
                </p>
              ) : (
                <p>לא נמצאו תוצאות עבור"{results.query}"</p>
              )}
            </div>

            {/* Articles Grid */}
            {results.articles.length > 0 && (
              <>
                <div className="space-y-4 mb-8">
                  {results.articles.map((article, index) => (
                    <motion.div
                      key={`${currentStart}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <NewsArticleCard article={article} />
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={currentStart === 1 || loading}
                  >
                    ← הקודם
                  </Button>
                  
                  <span className="text-text-secondary text-sm">
                    עמוד {Math.ceil(currentStart / 10)}
                  </span>

                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={!results.hasNextPage || loading}
                  >
                    הבא →
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* Empty State */}
        {!results && !loading && !error && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-text-muted text-lg">הזן מונח חיפוש כדי להתחיל</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}