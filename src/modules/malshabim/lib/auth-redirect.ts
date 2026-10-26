import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginRedirectPath } from "@/lib/auth/callback-url";

/** Redirect unauthenticated users to login while preserving the intended path. */
export async function redirectMalshabimLogin(fallback = "/malshabim"): Promise<never> {
  const pathname = (await headers()).get("x-etur-pathname") ?? fallback;
  redirect(loginRedirectPath(pathname, fallback));
}
