import postgres from "postgres";

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

let sqlClient: ReturnType<typeof postgres> | null = null;

export class NeonDatabase {
  public static createClient(): NeonSql {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("Missing DATABASE_URL");
    }
    if (!sqlClient) {
      sqlClient = postgres(normalizeDatabaseUrl(databaseUrl), {
        ssl: "require",
        max: 1,
        prepare: false,
      });
    }
    const sql = sqlClient;
    return ((strings: TemplateStringsArray, ...values: unknown[]) =>
      sql(strings, ...(values as never[]))) as NeonSql;
  }
}
