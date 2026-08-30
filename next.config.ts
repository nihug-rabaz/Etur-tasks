import type { NextConfig } from "next";
import os from "node:os";

function localLanHostnames(): string[] {
  const hosts = new Set<string>(["localhost", "127.0.0.1", "[::1]"]);
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.internal) continue;
      const family = String(entry.family);
      if (family !== "IPv4" && family !== "4") continue;
      hosts.add(entry.address);
    }
  }
  return [...hosts];
}

function allowedDevOrigins(): string[] {
  const origins = new Set<string>(localLanHostnames());
  const authUrl = process.env.NEXTAUTH_URL;
  if (authUrl) {
    try {
      origins.add(new URL(authUrl).hostname);
    } catch {
      /* keep discovered hosts */
    }
  }
  const extra = process.env.NEXT_DEV_ALLOWED_ORIGINS;
  if (extra) {
    for (const part of extra.split(",")) {
      const host = part.trim();
      if (host) origins.add(host);
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedDevOrigins(),
};

export default nextConfig;
