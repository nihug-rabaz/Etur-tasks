import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SupabaseEnv } from "@/lib/supabase/env";

export class SupabaseMiddleware {
  public static updateSession(request: NextRequest) {
    const response = NextResponse.next({ request });

    const supabase = createServerClient(
      SupabaseEnv.getUrl(),
      SupabaseEnv.getAnonKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    return { supabase, response };
  }
}
