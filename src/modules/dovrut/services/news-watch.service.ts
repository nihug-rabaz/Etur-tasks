import { createHash } from "node:crypto";
import { BaseService } from "@/services/base.service";
import { AppUrls } from "@/lib/urls/app-urls";
import { DovrutNewsService } from "@/modules/dovrut/services/news.service";
import { DovrutWorkflowSettingsService } from "@/modules/dovrut/services/workflow-settings.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import { OneSignalService } from "@/services/onesignal.service";

function urlHash(url: string): string {
  return createHash("sha256").update(url.trim()).digest("hex");
}

export class DovrutNewsWatchService extends BaseService {
  public async runScheduledSearch(): Promise<{
    keywords: number;
    newHits: number;
    notified: number;
  }> {
    const settings = await new DovrutWorkflowSettingsService().get();
    const keywords = settings.news_keywords.filter((k) => k.trim().length > 0);
    if (keywords.length === 0) {
      return { keywords: 0, newHits: 0, notified: 0 };
    }

    const news = new DovrutNewsService();
    const db = this.getDb();
    const newArticles: Array<{ title: string; url: string; keyword: string }> = [];

    for (const keyword of keywords) {
      try {
        const result = await news.search({ q: keyword, dateFilter: "day" });
        for (const article of result.articles) {
          if (!article.url?.trim()) continue;
          const hash = urlHash(article.url);
          const inserted = await db<{ url: string }[]>`
            insert into dovrut_news_seen (url_hash, url, title, keyword)
            values (${hash}, ${article.url}, ${article.title || null}, ${keyword})
            on conflict (url_hash) do nothing
            returning url
          `;
          if (inserted.length > 0) {
            newArticles.push({
              title: article.title || article.url,
              url: article.url,
              keyword,
            });
          }
        }
      } catch (error) {
        console.error("[dovrut-news-watch]", keyword, error);
      }
    }

    let notified = 0;
    if (newArticles.length > 0) {
      try {
        const users = await new ModuleRoleService().listModuleUsers("dovrut");
        const adminIds = users.filter((u) => u.role === "admin").map((u) => u.user_id);
        if (adminIds.length > 0) {
          const origin = AppUrls.getOrigin();
          const url = origin ? `${origin}/dovrut/news` : undefined;
          const preview = newArticles
            .slice(0, 5)
            .map((a) => `• [${a.keyword}] ${a.title}`)
            .join("\n");
          const text = [
            `דוברות · ${newArticles.length} כתבות חדשות במעקב`,
            preview,
            newArticles.length > 5 ? `ועוד ${newArticles.length - 5}…` : "",
          ]
            .filter(Boolean)
            .join("\n");
          const stats = await new OneSignalService().sendDirectMessages(
            adminIds,
            text,
            url,
          );
          notified = stats.sent;
        }
      } catch (error) {
        console.error("[dovrut-news-watch-notify]", error);
      }
    }

    return {
      keywords: keywords.length,
      newHits: newArticles.length,
      notified,
    };
  }
}
