"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { AlertCircle, CalendarRange, ClipboardCheck, Clock3, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import { AgamPublicChrome } from "@/modules/agam/components/public-chrome";
import { GoogleButton } from "@/modules/agam/pages/candidate-login-page";

export type EvaluatorLoginState =
  | { kind: "signed_out" }
  | { kind: "pending"; email: string | null }
  | { kind: "no_access"; email: string | null }
  | { kind: "candidate"; email: string | null };

const CALLBACK = "/agam/evaluator";

const PERKS = [
  { icon: CalendarRange, title: "המחזור הפעיל בלבד", text: "רשימה ממוקדת של המועמדים שאתם ממיינים עכשיו" },
  { icon: MessagesSquare, title: "ראיון ויום מיונים", text: "טופס הראיון וההערכה המלאים, ישירות מהטלפון" },
  { icon: ClipboardCheck, title: "יום מכין וסמ״ח", text: "ההערכה שלכם נשמרת ישר לתיק המועמד" },
] as const;

function Email({ value }: { value: string | null }) {
  return (
    <span dir="ltr" className="font-bold text-text-primary">
      {value ?? "חשבון Google"}
    </span>
  );
}

function StatusNotice({ state }: { state: EvaluatorLoginState }) {
  if (state.kind === "pending") {
    return (
      <div role="status" className="rounded-2xl bg-amber-500/10 px-4 py-3.5 text-start">
        <p className="flex items-center gap-2 text-sm font-extrabold text-text-primary">
          <Clock3 size={16} className="shrink-0 text-amber-600" />
          הבקשה שלכם ממתינה לאישור
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
          נכנסתם עם <Email value={state.email} />. צוות הקורס קיבל התראה — מיד כשיאשרו אתכם כמעריכים, תיכנסו מכאן
          ישירות למחזור הפעיל.
        </p>
      </div>
    );
  }
  if (state.kind === "no_access") {
    return (
      <div role="alert" className="rounded-2xl bg-amber-500/10 px-4 py-3.5 text-start">
        <p className="flex items-center gap-2 text-sm font-extrabold text-text-primary">
          <AlertCircle size={16} className="shrink-0 text-amber-600" />
          לחשבון הזה אין עדיין הרשאת מעריך
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
          <Email value={state.email} /> מחובר למערכת, אבל לא הוגדר כמעריך בקצינים. בקשו מצוות הקורס להוסיף לכם את
          התפקיד &quot;ממיין&quot;.
        </p>
        <Link href="/" className="mt-2 inline-block text-[13px] font-extrabold text-sky-700 hover:underline dark:text-sky-300">
          מעבר למערכת ←
        </Link>
      </div>
    );
  }
  if (state.kind === "candidate") {
    return (
      <div className="rounded-2xl bg-sky-500/10 px-4 py-3.5 text-start">
        <p className="text-sm font-extrabold text-text-primary">אתם מחוברים כמועמדים</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
          <Email value={state.email} /> מקושר לתיק מועמד. כניסת מעריכים מיועדת לצוות הממיינים.
        </p>
        <Link
          href="/agam/me"
          className="mt-2 inline-block text-[13px] font-extrabold text-sky-700 hover:underline dark:text-sky-300"
        >
          לתיק האישי שלי ←
        </Link>
      </div>
    );
  }
  return null;
}

export function AgamEvaluatorLoginPage({ state }: { state: EvaluatorLoginState }) {
  const signedIn = state.kind !== "signed_out";

  return (
    <AgamPublicChrome>
      <div className="w-full max-w-md pt-2 sm:pt-8">
        <section className="overflow-hidden rounded-[28px] bg-surface-1 shadow-[0_0_0_1px_rgba(22,24,29,0.05),0_24px_60px_-28px_rgba(22,24,29,0.35)] dark:bg-[#181a22] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
          <div className="relative overflow-hidden bg-gradient-to-bl from-emerald-500/20 via-teal-500/10 to-transparent px-6 pb-6 pt-7 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl"
            />
            <span className="relative mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-1 text-emerald-700 shadow-sm dark:text-emerald-300">
              <ShieldCheck size={28} />
            </span>
            <p className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-1/70 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
              <Sparkles size={12} />
              צוות המיון
            </p>
            <h1 className="relative mt-2 text-[1.6rem] font-extrabold leading-tight tracking-tight text-text-primary">
              כניסת מעריכים
            </h1>
            <p className="relative mt-1.5 text-sm text-text-secondary">קורס קציני דת · הרבנות הצבאית</p>
          </div>

          <div className="space-y-4 px-5 pb-6 pt-5 sm:px-6">
            <StatusNotice state={state} />

            {!signedIn ? (
              <ul className="space-y-2.5">
                {PERKS.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-extrabold text-text-primary">{title}</span>
                      <span className="block text-[12px] leading-relaxed text-text-muted">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="space-y-2">
              <GoogleButton
                label={signedIn ? "התחברות עם חשבון אחר" : "כניסה עם Google"}
                callbackUrl={CALLBACK}
              />
              <p className="text-center text-[12px] leading-relaxed text-text-muted">
                היכנסו עם חשבון ה־Google שאיתו צוות הקורס הגדיר אתכם.
              </p>
            </div>

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
          מועמדים?{" "}
          <Link href="/agam/login" className="font-extrabold text-text-secondary hover:text-text-primary hover:underline">
            כניסה לתיק המועמד
          </Link>
        </p>
      </div>
    </AgamPublicChrome>
  );
}
