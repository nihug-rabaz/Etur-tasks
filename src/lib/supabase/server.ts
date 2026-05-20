import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SupabaseEnv } from "@/lib/supabase/env";

export class ServerSupabaseFactory {
  public static async create() {
    const cookieStore = await cookies();
    return createServerClient(SupabaseEnv.getUrl(), SupabaseEnv.getAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });
  }
}
