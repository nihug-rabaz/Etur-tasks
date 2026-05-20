import type { NextConfig } from "next";

function allowedDevOrigins(): string[] {
  const origins = new Set<string>(["127.0.0.1"]);
  const authUrl = process.env.NEXTAUTH_URL;
  if (authUrl) {
    try {
      origins.add(new URL(authUrl).hostname);
    } catch {
      return [...origins];
    }
  }
  const extra = process.env.NEXT_DEV_ALLOWED_ORIGINS;
  if (extra) {
    for (const part of extra.split(",")) {
      const h = part.trim();
      if (h) origins.add(h);
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedDevOrigins(),
};

export default nextConfig;
