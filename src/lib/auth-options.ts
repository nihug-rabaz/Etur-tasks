import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { randomUUID } from "crypto";
import { NeonDatabase } from "@/lib/db/neon";
import { NotificationService } from "@/services/notification.service";

async function ensureProfile(email: string, name: string) {
  const db = NeonDatabase.createClient();
  const existingByEmail = await db<Array<{ id: string; is_approved: boolean }>>`
    select id, is_approved from profiles where email = ${email} limit 1
  `;
  if (existingByEmail.length > 0) {
    return existingByEmail[0];
  }

  const usersCountResult = await db<Array<{ count: number }>>`
    select count(*)::int as count from profiles
  `;
  const usersCount = usersCountResult[0]?.count ?? 0;
  const userId = randomUUID();
  const role = usersCount === 0 ? "admin" : "user";
  const isApproved = role === "admin";

  await db`
    insert into profiles (id, name, email, role, is_approved, approved_at)
    values (${userId}, ${name}, ${email}, ${role}, ${isApproved}, ${isApproved ? new Date().toISOString() : null})
  `;

  if (!isApproved) {
    try {
      await new NotificationService().notifyPendingUser({ userId, name, email });
    } catch (error) {
      console.error("[auth] pending user notification failed:", error);
    }
  }

  return { id: userId, is_approved: isApproved };
}

async function fetchProfileApproval(userId: string) {
  const db = NeonDatabase.createClient();
  const rows = await db<Array<{ is_approved: boolean; role: "admin" | "user" }>>`
    select is_approved, role from profiles where id = ${userId} limit 1
  `;
  return rows[0] ?? { is_approved: false, role: "user" as const };
}

const devLogger =
  process.env.NODE_ENV === "development"
    ? {
        error(code: string, ...meta: unknown[]) {
          console.error("[next-auth]", code, ...meta);
        },
        warn(code: string, ...meta: unknown[]) {
          console.warn("[next-auth]", code, ...meta);
        },
        debug(code: string, ...meta: unknown[]) {
          console.debug("[next-auth]", code, ...meta);
        },
      }
    : undefined;

export const authOptions = {
  debug: process.env.NODE_ENV === "development",
  logger: devLogger,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({
      token,
      account,
      profile,
    }: {
      token: JWT;
      account: { provider?: string | null } | null;
      profile?: { email?: string | null; name?: string | null } | null;
    }) {
      if (account?.provider === "google") {
        const email =
          typeof profile?.email === "string" && profile.email.length > 0
            ? profile.email
            : null;
        if (!email) {
          console.error("[auth] Google profile has no email");
          throw new Error("Google did not return an email for this account.");
        }
        const profileName =
          profile && typeof profile.name === "string" ? profile.name : "Google User";
        try {
          const ensured = await ensureProfile(email, profileName);
          token.userId = ensured.id;
          token.isApproved = ensured.is_approved;
        } catch (err) {
          console.error("[auth] ensureProfile failed:", err);
          throw err;
        }
      }
      if (token.userId) {
        const profile = await fetchProfileApproval(String(token.userId));
        token.isApproved = profile.is_approved;
        token.role = profile.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.userId) {
        session.user.id = String(token.userId);
        session.user.isApproved = Boolean(token.isApproved);
        session.user.role = token.role ?? "user";
      }
      return session;
    },
  },
};
