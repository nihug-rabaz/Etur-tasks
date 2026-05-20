import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

let cachedEnv: Record<string, string> | null = null;

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

function loadLocalEnv(): Record<string, string> {
  if (cachedEnv) return cachedEnv;
  cachedEnv = {};
  const candidates = [".env.local", ".env.development.local", ".env.development", ".env"];
  for (const fileName of candidates) {
    const filePath = resolve(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;
    try {
      const parsed = parseEnvFile(readFileSync(filePath, "utf8"));
      cachedEnv = { ...parsed, ...cachedEnv };
    } catch {
      continue;
    }
  }
  return cachedEnv;
}

export class Env {
  public static get(key: string): string | undefined {
    const fromProcess = process.env[key];
    if (fromProcess && fromProcess.length > 0) {
      return fromProcess;
    }
    const local = loadLocalEnv();
    return local[key] || undefined;
  }

  public static require(key: string): string {
    const value = Env.get(key);
    if (!value) {
      throw new Error(`Missing required env var: ${key}`);
    }
    return value;
  }
}
