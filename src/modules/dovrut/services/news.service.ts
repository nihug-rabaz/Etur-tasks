export class DovrutNewsService {
  public async search(input: {
    q: string;
    dateFilter?: string;
    startDate?: string;
    endDate?: string;
    start?: number;
  }): Promise<{
    articles: {
      id: string;
      title: string;
      description: string;
      url: string;
      publishedAt: string | null;
      source: string;
      imageUrl: string | null;
    }[];
    totalResults: string;
    query: string;
    hasNextPage: boolean;
    nextStartIndex: number;
    currentStart: number;
  }> {
    const apiKey =
      process.env.GOOGLE_CUSTOM_SEARCH_API?.trim() ||
      process.env.GOOGLE_CSE_API_KEY?.trim() ||
      "";
    const engineId =
      process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim() ||
      process.env.GOOGLE_CSE_CX?.trim() ||
      "";

    if (apiKey && engineId) {
      return this.searchWithCustomSearch(input, apiKey, engineId);
    }
    return this.searchWithGoogleNewsRss(input);
  }

  private async searchWithCustomSearch(
    input: {
      q: string;
      dateFilter?: string;
      startDate?: string;
      endDate?: string;
      start?: number;
    },
    apiKey: string,
    engineId: string,
  ) {
    const start = Math.max(1, Math.min(91, input.start ?? 1));
    const params = new URLSearchParams({
      key: apiKey,
      cx: engineId,
      q: `"${input.q}"`,
      exactTerms: input.q,
      gl: "il",
      hl: "iw",
      num: "10",
      start: String(start),
    });

    if (input.dateFilter === "day") params.set("dateRestrict", "d1");
    if (input.dateFilter === "week") params.set("dateRestrict", "d7");
    if (input.dateFilter === "month") params.set("dateRestrict", "m1");
    if (input.dateFilter === "year") params.set("dateRestrict", "y1");
    if (input.dateFilter === "custom" && input.startDate && input.endDate) {
      const from = input.startDate.replaceAll("-", "");
      const to = input.endDate.replaceAll("-", "");
      params.set("sort", `date:r:${from}:${to}`);
    }

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    if (!response.ok) {
      throw new Error("חיפוש החדשות נכשל (Google CSE)");
    }
    const data = (await response.json()) as {
      items?: {
        title?: string;
        snippet?: string;
        link?: string;
        displayLink?: string;
        pagemap?: { cse_image?: { src?: string }[]; metatags?: { "article:published_time"?: string }[] };
      }[];
      searchInformation?: { totalResults?: string };
      queries?: { nextPage?: { startIndex?: number }[] };
    };

    const needle = input.q.toLowerCase();
    const articles = (data.items ?? [])
      .filter((item) => {
        const hay = `${item.title ?? ""} ${item.snippet ?? ""}`.toLowerCase();
        return hay.includes(needle);
      })
      .map((item, index) => ({
        id: `${start}-${index}`,
        title: item.title ?? "",
        description: item.snippet ?? "",
        url: item.link ?? "",
        publishedAt: item.pagemap?.metatags?.[0]?.["article:published_time"] ?? null,
        source: item.displayLink ?? "",
        imageUrl: item.pagemap?.cse_image?.[0]?.src ?? null,
      }));

    const nextStartIndex = data.queries?.nextPage?.[0]?.startIndex ?? start + 10;
    return {
      articles,
      totalResults: data.searchInformation?.totalResults ?? "0",
      query: input.q,
      hasNextPage: Boolean(data.queries?.nextPage?.length),
      nextStartIndex,
      currentStart: start,
    };
  }

  private async searchWithGoogleNewsRss(input: {
    q: string;
    start?: number;
  }) {
    const start = Math.max(1, input.start ?? 1);
    const pageSize = 10;
    const page = Math.floor((start - 1) / pageSize);
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(input.q)}&hl=he&gl=IL&ceid=IL:he`;
    const response = await fetch(url, {
      headers: { "User-Agent": "etur-tasks-news/1.0" },
    });
    if (!response.ok) {
      throw new Error("חיפוש החדשות נכשל");
    }
    const xml = await response.text();
    const items = this.parseRssItems(xml);
    const slice = items.slice(page * pageSize, page * pageSize + pageSize);
    const articles = slice.map((item, index) => ({
      id: `${start}-${index}`,
      title: item.title,
      description: item.description,
      url: item.link,
      publishedAt: item.publishedAt,
      source: item.source,
      imageUrl: null as string | null,
    }));

    return {
      articles,
      totalResults: String(items.length),
      query: input.q,
      hasNextPage: (page + 1) * pageSize < items.length,
      nextStartIndex: start + pageSize,
      currentStart: start,
    };
  }

  private parseRssItems(xml: string): Array<{
    title: string;
    description: string;
    link: string;
    publishedAt: string | null;
    source: string;
  }> {
    const items: Array<{
      title: string;
      description: string;
      link: string;
      publishedAt: string | null;
      source: string;
    }> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = this.readRssTag(block, "title");
      const link = this.readRssTag(block, "link");
      const description = this.stripHtml(this.readRssTag(block, "description"));
      const publishedAt = this.readRssTag(block, "pubDate") || null;
      const source = this.readRssTag(block, "source") || this.hostFromUrl(link);
      if (!title || !link) continue;
      items.push({ title, description, link, publishedAt, source });
    }
    return items;
  }

  private readRssTag(block: string, tag: string): string {
    const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
    const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const cdataMatch = block.match(cdata);
    if (cdataMatch?.[1]) return cdataMatch[1].trim();
    const plainMatch = block.match(plain);
    return plainMatch?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  private hostFromUrl(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }
}
