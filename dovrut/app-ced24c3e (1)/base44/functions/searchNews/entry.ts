import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const query = payload.q;
    const dateFilter = payload.dateFilter || 'all';
    const startDate = payload.startDate;
    const endDate = payload.endDate;
    const start = parseInt(payload.start || '1', 10);

    if (!query || query.trim() === '') {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    // Validate start index (max 91 to stay under 100-result limit)
    if (start > 91) {
      return Response.json({ error: 'Start index exceeds API limit' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_CUSTOM_SEARCH_API');
    const searchEngineId = Deno.env.get('GOOGLE_CUSTOM_SEARCH_ENGINE_ID');

    if (!apiKey || !searchEngineId) {
      return Response.json({ error: 'API configuration missing' }, { status: 500 });
    }

    // Build query parameters
    const trimmedQuery = query.trim();
    const exactPhrase = trimmedQuery.startsWith('"') && trimmedQuery.endsWith('"') 
      ? trimmedQuery 
      : `"${trimmedQuery}"`;
    const exactTerms = trimmedQuery.replace(/^"|"$/g, '');

    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: exactPhrase,
      exactTerms: exactTerms,
      gl: 'il',
      hl: 'iw',
      num: '10',
      start: start.toString(),
    });

    // Handle date filtering
    if (dateFilter !== 'all' && dateFilter !== 'custom') {
      // Predefined ranges
      const dateRestrictMap = {
        'day': 'd1',
        'week': 'd7',
        'lastWeek': 'w1',
        'month': 'm1',
        'year': 'y1',
      };
      
      if (dateRestrictMap[dateFilter]) {
        params.append('dateRestrict', dateRestrictMap[dateFilter]);
        params.append('sort', 'date');
      }
    } else if (dateFilter === 'custom' && startDate && endDate) {
      // Custom date range
      const formatDate = (date) => date.replace(/-/g, '');
      params.append('sort', `date:r:${formatDate(startDate)}:${formatDate(endDate)}`);
    }

    // Call Google Custom Search API
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ 
        error: 'Search API error', 
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();

    // Post-processing filter: whole-word/exact phrase matching
    let filteredItems = data.items || [];
    if (filteredItems.length > 0) {
      const escapedQuery = exactTerms.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\s|[.,!?"':-])${escapedQuery}(?:$|\\s|[.,!?"':-])`, 'i');
      filteredItems = filteredItems.filter(item =>
        regex.test(item.title || '') || regex.test(item.snippet || '')
      );
    }

    // Map to Article format
    const articles = filteredItems.map((item, index) => ({
      id: `article-${index}-${Date.now()}`,
      title: item.title || '',
      description: item.snippet || '',
      url: item.link || '',
      publishedAt: item.pagemap?.metatags?.[0]?.['article:published_time'] || new Date().toISOString(),
      source: item.pagemap?.metatags?.[0]?.['og:site_name'] || new URL(item.link).hostname,
      imageUrl: item.pagemap?.cse_image?.[0]?.src || null,
    }));

    // Pagination info
    const hasNextPage = data.queries?.nextPage && data.queries.nextPage.length > 0;
    const nextStartIndex = hasNextPage ? data.queries.nextPage[0].startIndex : undefined;

    return Response.json({
      articles,
      totalResults: parseInt(data.searchInformation?.totalResults || '0', 10),
      query: trimmedQuery,
      hasNextPage,
      nextStartIndex,
      currentStart: start,
    });

  } catch (error) {
    return Response.json({ 
      error: 'Internal server error', 
      message: error.message 
    }, { status: 500 });
  }
});