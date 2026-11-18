"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import {
  AlertCircle,
  ChevronDown,
  ClipboardCheck,
  FileUp,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  Search,
  UserRound,
} from "lucide-react";
import { AgamPublicChrome } from "@/modules/agam/components/public-chrome";
import { fieldClass, secondaryButtonClass } from "@/modules/agam/lib/ui";

export type CandidateLoginState =
  | { kind: "signed_out" }
  | { kind: "unmatched"; email: string | null }
  | { kind: "staff"; email: string | null };

const CALLBACK = "/agam/login";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function GoogleButton({ label, variant = "primary" }: { label: string; variant?: "primary" | "secondary" }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void signIn("google", { callbackUrl: CALLBACK }, { prompt: "select_account" }).catch(() => setLoading(false));
      }}
      className={`flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl text-[15px] font-extrabold transition disabled:cursor-wait disabled:opacity-70 ${
        variant === "primary"
          ? "bg-text-primary text-surface-1 shadow-[0_10px_24px_-12px_rgba(22,24,29,0.55)] hover:opacity-90"
          : "ui-card bg-surface-1 text-text-primary hover:bg-surface-2"
      }`}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white">
          <GoogleMark />
        </span>
      )}
      {loading ? "מעביר ל־Google…" : label}
    </button>
  );
}

function StatusNotice({ state }: { state: CandidateLoginState }) {
  if (state.kind === "unmatched") {
    return (
      <div role="alert" className="rounded-2xl bg-amber-500/10 px-4 py-3.5 text-start">
        <p className="flex items-center gap-2 text-sm font-extrabold text-text-primary">
          <AlertCircle size={16} className="shrink-0 text-amber-600" />
          החשבון הזה לא מקושר לתיק מועמד
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
          התחברתם עם{" "}
          <span dir="ltr" className="font-bold text-text-primary">
            {state.email ?? "חשבון Google"}
          </span>
          , אבל בשאלון ההרשמה מולא מייל אחר. התחברו עם המייל שמילאתם בשאלון.
        </p>
      </div>
    );
  }
  if (state.kind === "staff") {
    return (
      <div className="rounded-2xl bg-sky-500/10 px-4 py-3.5 text-start">
        <p className="text-sm font-extrabold text-text-primary">אתם מחוברים כאנשי צוות</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
          <span dir="ltr" className="font-bold text-text-primary">
            {state.email}
          </span>{" "}
          אינו מקושר לתיק מועמד. כדי להיכנס כמועמד, התחברו עם המייל שמילאתם בשאלון.
        </p>
        <Link href="/" className="mt-2 inline-block text-[13px] font-extrabold text-sky-700 hover:underline dark:text-sky-300">
          מעבר למערכת הצוות ←
        </Link>
      </div>
    );
  }
  return null;
}

function EmailLookup() {
  const [open, setOpen] = useState(false);
  const [personalNumber, setPersonalNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ firstName: string; maskedEmail: string | null } | null>(null);

  const lookup = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/agam/public/candidate-login/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalNumber, phone }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        firstName?: string;
        maskedEmail?: string | null;
      };
      if (!response.ok) throw new Error(data.error || "החיפוש נכשל");
      setResult({ firstName: data.firstName ?? "", maskedEmail: data.maskedEmail ?? null });
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "החיפוש נכשל");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-surface-2/70">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start"
      >
        <span className="flex items-center gap-2 text-[13px] font-extrabold text-text-primary">
          <KeyRound size={15} className="text-text-muted" />
          לא זוכרים באיזה מייל נרשמתם?
        </span>
        <ChevronDown size={16} className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <form
          className="space-y-2.5 px-4 pb-4"
          onSubmit={(event) => {
            event.preventDefault();
            void lookup();
          }}
        >
          <p className="text-[12px] leading-relaxed text-text-secondary">
            הזינו את הפרטים מהשאלון ונראה לכם עם איזה מייל נרשמתם.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              className={fieldClass}
              placeholder="מספר אישי"
              inputMode="numeric"
              autoComplete="off"
              value={personalNumber}
              onChange={(event) => setPersonalNumber(event.target.value)}
              dir="ltr"
            />
            <input
              className={fieldClass}
              placeholder="טלפון"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            className={`${secondaryButtonClass} w-full`}
            disabled={loading || personalNumber.trim().length < 2 || phone.trim().length < 7}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            חיפוש
          </button>

          {error ? <p className="text-[12px] font-bold text-rose-700 dark:text-rose-300">{error}</p> : null}

          {result ? (
            <div className="rounded-xl bg-surface-1 px-3.5 py-3">
              {result.maskedEmail ? (
                <>
                  <p className="text-[13px] text-text-secondary">
                    {result.firstName ? `${result.firstName}, נרשמת עם המייל:` : "נרשמת עם המייל:"}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[15px] font-extrabold text-text-primary">
                    <Mail size={15} className="shrink-0 text-text-muted" />
                    <span dir="ltr">{result.maskedEmail}</span>
                  </p>
                  <p className="mt-1.5 text-[12px] text-text-muted">התחברו עם חשבון ה־Google הזה בכפתור למעלה.</p>
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-text-secondary">
                  לא שמור מייל בתיק שלכם. פנו לצוות הקורס כדי לעדכן מייל ולקבל גישה.
                </p>
              )}
            </div>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

const PERKS = [
  { icon: UserRound, label: "פרטים אישיים ומסלול המיון" },
  { icon: FileUp, label: "העלאת מסמכים נדרשים" },
  { icon: ClipboardCheck, label: "מבחנים, ציונים והערכות" },
] as const;

export function AgamCandidateLoginPage({ state }: { state: CandidateLoginState }) {
  const signedIn = state.kind !== "signed_out";

  return (
    <AgamPublicChrome>
      <div className="w-full max-w-md pt-2 sm:pt-8">
        <section className="overflow-hidden rounded-[28px] bg-surface-1 shadow-[0_0_0_1px_rgba(22,24,29,0.05),0_24px_60px_-28px_rgba(22,24,29,0.35)] dark:bg-[#181a22] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
          <div className="relative bg-gradient-to-bl from-violet-500/15 via-sky-500/10 to-transparent px-6 pb-6 pt-7 text-center">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-1 text-violet-700 shadow-sm dark:text-violet-300">
              <GraduationCap size={28} />
            </span>
            <h1 className="mt-4 text-[1.6rem] font-extrabold leading-tight tracking-tight text-text-primary">
              כניסה לתיק המועמד
            </h1>
            <p className="mt-1.5 text-sm text-text-secondary">קורס קציני דת · הרבנות הצבאית</p>
          </div>

          <div className="space-y-4 px-5 pb-6 pt-5 sm:px-6">
            <StatusNotice state={state} />

            {!signedIn ? (
              <ul className="space-y-2">
                {PERKS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2.5 text-[13px] font-bold text-text-secondary">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-text-primary">
                      <Icon size={14} />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="space-y-2">
              <GoogleButton label={signedIn ? "התחברות עם חשבון אחר" : "כניסה עם Google"} />
              <p className="text-center text-[12px] leading-relaxed text-text-muted">
                השתמשו בחשבון Google של המייל שמילאתם בשאלון ההרשמה.
              </p>
            </div>

            <EmailLookup />

            {signedIn ? (
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: CALLBACK })}
                className="w-full text-center text-[12px] font-bold text-text-muted transition hover:text-text-primary"
              >
                יציאה מהחשבון הנוכחי
              </button>
            ) : null}
          </div>
        </section>

        <p className="mt-5 text-center text-[12px] leading-relaxed text-text-muted">
          עוד לא נרשמתם? בקשו מצוות הקורס את קישור ההרשמה למחזור שלכם.
        </p>
      </div>
    </AgamPublicChrome>
  );
}
