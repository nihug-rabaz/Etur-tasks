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
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API;
    const engineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
    if (!apiKey || !engineId) {
      throw new Error("Google Custom Search is not configured");
    }

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
      throw new Error("News search failed");
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
}
