import { cookies } from "next/headers";

const IMPERSONATION_COOKIE = "impersonated_user_id";

export class ImpersonationManager {
  public static async getTargetUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const value = cookieStore.get(IMPERSONATION_COOKIE)?.value?.trim();
    return value || null;
  }

  public static async setTargetUserId(userId: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATION_COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }

  public static async clear(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATION_COOKIE);
  }
}
