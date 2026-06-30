import { Env } from "@/lib/env";

export class AppUrls {
  public static getOrigin(): string {
    const raw = Env.get("NEXTAUTH_URL") ?? Env.get("VERCEL_URL");
    if (!raw) return "";
    const trimmed = raw.replace(/\/$/, "");
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return `https://${trimmed}`;
  }

  public static taskDetailPath(taskId: string): string {
    return `/dashboard?task=${taskId}`;
  }

  public static taskDetail(taskId: string): string {
    const origin = AppUrls.getOrigin();
    const path = AppUrls.taskDetailPath(taskId);
    return origin ? `${origin}${path}` : path;
  }

  public static scheduleDetailPath(eventId: string): string {
    return `/tasks/upcoming?schedule=${eventId}`;
  }

  public static scheduleDetail(eventId: string): string {
    const origin = AppUrls.getOrigin();
    const path = AppUrls.scheduleDetailPath(eventId);
    return origin ? `${origin}${path}` : path;
  }
}
