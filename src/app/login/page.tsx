import { headers } from "next/headers";

import { GoogleSignInForm } from "@/components/google-signin-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(
  q: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = q[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function inferOriginFromHeaders(headerList: Headers) {
  const host = headerList.get("host") ?? "localhost:3000";
  const forwardedProto = headerList.get("x-forwarded-proto");
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = forwardedProto ?? (local ? "http" : "https");
  return `${protocol}://${host}`;
}

function pairedLocalCallbackUrl(origin: string) {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const portPart = u.port ? `:${u.port}` : "";
    if (u.hostname === "localhost") {
      return `http://127.0.0.1${portPart}/api/auth/callback/google`;
    }
    if (u.hostname === "127.0.0.1") {
      return `http://localhost${portPart}/api/auth/callback/google`;
    }
  } catch {
    return null;
  }
  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const q = searchParams ? await searchParams : {};
  const authError = pickParam(q, "error");
  const errorDescRaw = pickParam(q, "error_description");
  let errorDetail: string | null = null;
  if (errorDescRaw) {
    try {
      errorDetail = decodeURIComponent(errorDescRaw.replace(/\+/g, " "));
    } catch {
      errorDetail = errorDescRaw;
    }
  }
  const spuriousGoogleError =
    authError === "google" && !errorDetail;
  const headerList = await headers();
  const origin = inferOriginFromHeaders(headerList);
  const callbackPrimary = `${origin}/api/auth/callback/google`;
  const callbackAlt = pairedLocalCallbackUrl(origin);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent-cyan/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-accent-purple/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute left-1/3 top-1/3 h-64 w-64 rounded-full bg-accent-orange/15 blur-3xl" aria-hidden />
      <div className="relative w-full max-w-md rounded-3xl bg-surface-1/95 p-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-text-primary">
          ברוך הבא
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          התחבר כדי לנהל את משימות הצוות.
        </p>
        {authError && !spuriousGoogleError ? (
          <div
            role="alert"
            className="mt-4 space-y-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900"
          >
            <p className="font-medium">התחברות עם Google נכשלה ({authError}).</p>
            {errorDetail ? (
              <p className="rounded-lg bg-white/90 px-2 py-1.5 text-xs leading-relaxed text-stone-900">
                {errorDetail}
              </p>
            ) : null}
            <p className="text-xs text-rose-800/95">
              Redirect URIs (Google Cloud → Web client): העתק לפי ה-host שבכתובת הדפדפן עכשיו.
            </p>
            <code className="block break-all rounded-lg bg-white/90 px-2 py-1.5 text-xs text-stone-900">
              {callbackPrimary}
            </code>
            {callbackAlt ? (
              <code className="block break-all rounded-lg bg-white/90 px-2 py-1.5 text-xs text-stone-900">
                {callbackAlt}
              </code>
            ) : null}
            <p className="text-xs text-rose-800/90">
              <code>NEXTAUTH_URL</code> חייב להתאים לכתובת הגלישה (ללא <code>/</code> בסוף). אם נכנסת דרך
              כתובת רשת (למשל 192.168.x.x), אותה כתובת גם ב-Google וגם ב-env.
            </p>
          </div>
        ) : null}
        <div className="mt-6">
          <GoogleSignInForm />
        </div>
      </div>
    </div>
  );
}
