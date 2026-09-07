"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AgamPublicChrome } from "@/modules/agam/components/public-chrome";
import { AgamQuestionField } from "@/modules/agam/components/question-field";
import { groupQuestionsBySection, isQuestionVisible } from "@/modules/agam/lib/questions";
import { panelClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamQuestion } from "@/modules/agam/types";

export function AgamApplyWizard() {
  const [questions, setQuestions] = useState<AgamQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/agam/public/questions")
      .then((response) => response.json())
      .then((data: { questions?: AgamQuestion[] }) => setQuestions(data.questions ?? []))
      .finally(() => setLoaded(true));
  }, []);

  const sections = useMemo(() => groupQuestionsBySection(questions), [questions]);
  const current = sections[step];
  const progress = sections.length ? ((step + 1) / sections.length) * 100 : 0;

  const validateStep = () => {
    if (!current) return false;
    for (const question of current[1].items.filter((item) => isQuestionVisible(item, form))) {
      if (question.is_required && !String(form[question.field_key] ?? "").trim()) {
        setError(`נא למלא: ${question.question_text}`);
        return false;
      }
    }
    setError("");
    return true;
  };

  const submit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    const response = await fetch("/api/agam/public/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.full_name,
        personalNumber: form.personal_number,
        phone: form.phone ?? null,
        questionnaireData: form,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "שליחה נכשלה");
      return;
    }
    setDone(true);
  };

  if (!loaded) {
    return (
      <AgamPublicChrome>
        <p className="w-full py-16 text-center text-sm text-text-muted">טוען…</p>
      </AgamPublicChrome>
    );
  }

  if (questions.length === 0) {
    return (
      <AgamPublicChrome>
        <div className={`${panelClass} w-full p-8 text-center text-sm text-text-muted`}>
          השאלון אינו זמין כרגע.
        </div>
      </AgamPublicChrome>
    );
  }

  if (done) {
    return (
      <AgamPublicChrome>
        <div className={`${panelClass} w-full max-w-lg p-8 text-center sm:p-10`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-text-primary">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-text-primary">תודה</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            השאלון התקבל בהצלחה. מחכים לפגוש אותך ביום המיונים.
          </p>
        </div>
      </AgamPublicChrome>
    );
  }

  return (
    <AgamPublicChrome>
      <div className={`${panelClass} w-full p-5 sm:p-7`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          שאלון מקדים
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
          יום מיונים · קורס קציני דת
        </h1>
        <p className="mt-2 text-sm text-text-secondary">מלאו את הפרטים בשלבים. שדות חובה מסומנים ב־*.</p>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-text-muted">
            <span>
              שלב {step + 1} מתוך {sections.length}
            </span>
            <span className="truncate font-bold text-text-primary">{current?.[1].name}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-text-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sections.map(([key, section], index) => (
              <span
                key={key}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  index === step
                    ? "bg-text-primary text-white"
                    : index < step
                      ? "bg-surface-2 text-text-primary"
                      : "bg-surface-2/50 text-text-muted"
                }`}
              >
                {section.name}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          {current?.[1].items
            .filter((question) => isQuestionVisible(question, form))
            .map((question) => (
              <div
                key={question.id}
                className={question.field_type === "textarea" ? "sm:col-span-2" : undefined}
              >
                <AgamQuestionField
                  question={question}
                  value={form[question.field_key] ?? ""}
                  onChange={(value) =>
                    setForm((currentForm) => ({ ...currentForm, [question.field_key]: value }))
                  }
                />
              </div>
            ))}
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}

        <div className="ui-divider-top mt-8 flex justify-between gap-3 pt-5">
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={step === 0}
            onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
          >
            הקודם
          </button>
          {step < sections.length - 1 ? (
            <button
              type="button"
              className={primaryButtonClass}
              onClick={() => {
                if (validateStep()) setStep((currentStep) => currentStep + 1);
              }}
            >
              המשך
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-orange px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(251,146,60,0.55)] transition hover:brightness-105 disabled:opacity-50"
              onClick={() => void submit()}
              disabled={loading}
            >
              {loading ? "שולח…" : "שליחת שאלון"}
            </button>
          )}
        </div>
      </div>
    </AgamPublicChrome>
  );
}
