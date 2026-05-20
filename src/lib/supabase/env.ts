export class SupabaseEnv {
  public static getUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
    }
    return url;
  }

  public static getAnonKey(): string {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    return key;
  }
}
