"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AgamPublicChrome } from "@/modules/agam/components/public-chrome";
import { AgamQuestionField } from "@/modules/agam/components/question-field";
import { groupQuestionsBySection, isQuestionVisible } from "@/modules/agam/lib/questions";
import { primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
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
        <p className="text-sm text-text-muted">טוען…</p>
      </AgamPublicChrome>
    );
  }

  if (questions.length === 0) {
    return (
      <AgamPublicChrome>
        <div className="dashboard-glass rounded-3xl p-8 text-center">השאלון אינו זמין כרגע.</div>
      </AgamPublicChrome>
    );
  }

  if (done) {
    return (
      <AgamPublicChrome>
        <div className="dashboard-glass w-full max-w-md rounded-3xl p-8 text-center">
          <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
          <h1 className="mt-4 text-3xl font-extrabold text-text-primary">תודה!</h1>
          <p className="mt-2 text-sm text-text-secondary">השאלון התקבל בהצלחה.</p>
        </div>
      </AgamPublicChrome>
    );
  }

  return (
    <AgamPublicChrome>
      <div className="dashboard-glass w-full max-w-2xl rounded-3xl p-8">
        <p className="text-sm font-bold text-accent-primary">שאלון מקדים</p>
        <h1 className="mt-2 text-3xl font-extrabold text-text-primary">איתור קציני דת</h1>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          שלב {step + 1} מתוך {sections.length}: {current?.[1].name}
        </p>
        <div className="mt-6 space-y-4">
          {current?.[1].items
            .filter((question) => isQuestionVisible(question, form))
            .map((question) => (
              <AgamQuestionField
                key={question.id}
                question={question}
                value={form[question.field_key] ?? ""}
                onChange={(value) => setForm((currentForm) => ({ ...currentForm, [question.field_key]: value }))}
              />
            ))}
        </div>
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-6 flex justify-between gap-3">
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
              הבא
            </button>
          ) : (
            <button type="button" className={primaryButtonClass} onClick={() => void submit()} disabled={loading}>
              {loading ? "שולח…" : "שליחה"}
            </button>
          )}
        </div>
      </div>
    </AgamPublicChrome>
  );
}
