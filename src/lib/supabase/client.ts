import { createBrowserClient } from "@supabase/ssr";
import { SupabaseEnv } from "@/lib/supabase/env";

export class BrowserSupabaseFactory {
  public static create() {
    return createBrowserClient(SupabaseEnv.getUrl(), SupabaseEnv.getAnonKey());
  }
}
