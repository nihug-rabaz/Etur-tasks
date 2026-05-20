import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth-options";

type JwtDecoder = {
  decode: (params: { token: string; secret: string }) => Promise<{ userId?: unknown } | null>;
};

export async function resolveAuthenticatedUserId(): Promise<string | null> {
  const session = (await getServerSession(authOptions as never)) as Session | null;
  if (session?.user?.id) {
    return session.user.id;
  }

  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get("next-auth.session-token")?.value ??
    cookieStore.get("__Secure-next-auth.session-token")?.value;
  if (!sessionToken || !process.env.NEXTAUTH_SECRET) {
    return null;
  }

  const jwtModule = (await import("next-auth/jwt")) as unknown as JwtDecoder;
  const token = await jwtModule.decode({
    token: sessionToken,
    secret: process.env.NEXTAUTH_SECRET,
  });
  return token?.userId ? String(token.userId) : null;
}
