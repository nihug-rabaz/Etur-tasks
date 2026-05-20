import { neon } from "@neondatabase/serverless";

export type NeonSql = <T = unknown>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T>;

function normalizeDatabaseUrl(raw: string): string {
  let url = raw.trim();
  if (
    (url.startsWith("'") && url.endsWith("'")) ||
    (url.startsWith('"') && url.endsWith('"'))
  ) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

export class NeonDatabase {
  public static createClient(): NeonSql {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("Missing DATABASE_URL");
    }
    const raw = neon(normalizeDatabaseUrl(databaseUrl));
    return ((strings: TemplateStringsArray, ...values: unknown[]) =>
      raw(strings, ...values)) as NeonSql;
  }
}
