"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AgamPublicChrome } from "@/modules/agam/components/public-chrome";
import { AgamQuestionField } from "@/modules/agam/components/question-field";
import { groupQuestionsBySection, isQuestionVisible } from "@/modules/agam/lib/questions";
import { fieldClass, panelClass, primaryButtonClass, secondaryButtonClass } from "@/modules/agam/lib/ui";
import type { AgamCandidate, AgamInterview, AgamQuestion } from "@/modules/agam/types";

type PortalSession = {
  candidateId: string;
  token: string;
};

const STORAGE_KEY = "agam-portal-session";

async function portalFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-agam-portal-token": token,
      ...(init?.headers ?? {}),
    },
  });
  const json = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(json.error || "הבקשה נכשלה");
  }
  return json;
}

export function AgamCandidatePortalPage() {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [personalNumber, setPersonalNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [candidate, setCandidate] = useState<AgamCandidate | null>(null);
  const [questions, setQuestions] = useState<AgamQuestion[]>([]);
  const [interviewQuestions, setInterviewQuestions] = useState<AgamQuestion[]>([]);
  const [interview, setInterview] = useState<AgamInterview | null>(null);
  const [profileData, setProfileData] = useState<Record<string, string>>({});
  const [interviewData, setInterviewData] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"profile" | "interview">("profile");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw) as PortalSession);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    void portalFetch<{
      candidate: AgamCandidate;
      questions: AgamQuestion[];
      interviewQuestions: AgamQuestion[];
      interview: AgamInterview | null;
    }>(`/api/agam/public/portal/me?candidateId=${session.candidateId}`, session.token)
      .then((data) => {
        setCandidate(data.candidate);
        setQuestions(data.questions ?? []);
        setInterviewQuestions(data.interviewQuestions ?? []);
        setInterview(data.interview);
        const q = (data.candidate.questionnaire_data ?? {}) as Record<string, unknown>;
        const next: Record<string, string> = {};
        for (const [key, value] of Object.entries(q)) next[key] = String(value ?? "");
        next.full_name = data.candidate.full_name;
        next.personal_number = data.candidate.personal_number;
        next.phone = data.candidate.phone ?? "";
        next.direct_commander_name = data.candidate.direct_commander_name ?? next.direct_commander_name ?? "";
        next.direct_commander_role =
          data.candidate.direct_commander_role ?? next.direct_commander_role ?? "";
        setProfileData(next);
        const part = (data.interview?.candidate_part ?? {}) as Record<string, unknown>;
        const interviewNext: Record<string, string> = {};
        for (const [key, value] of Object.entries(part)) interviewNext[key] = String(value ?? "");
        setInterviewData(interviewNext);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "טעינה נכשלה");
        sessionStorage.removeItem(STORAGE_KEY);
        setSession(null);
      });
  }, [session]);

  const profileSections = useMemo(() => groupQuestionsBySection(questions), [questions]);
  const interviewSections = useMemo(
    () => groupQuestionsBySection(interviewQuestions),
    [interviewQuestions],
  );

  const verify = async () => {
    setVerifying(true);
    try {
      const data = await fetch("/api/agam/public/portal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalNumber, phone }),
      }).then(async (response) => {
        const json = (await response.json()) as { candidateId?: string; token?: string; error?: string };
        if (!response.ok) throw new Error(json.error || "אימות נכשל");
        return json;
      });
      const next = { candidateId: data.candidateId!, token: data.token! };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSession(next);
      toast.success("התחברתם לפורטל");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "אימות נכשל");
    } finally {
      setVerifying(false);
    }
  };

  const saveProfile = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await portalFetch(`/api/agam/public/portal/me?candidateId=${session.candidateId}`, session.token, {
        method: "PATCH",
        body: JSON.stringify({ questionnaireData: profileData }),
      });
      toast.success("פרטי המועמד נשמרו");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const saveInterview = async (complete: boolean) => {
    if (!session) return;
    setSaving(true);
    try {
      await portalFetch(
        `/api/agam/public/portal/interview?candidateId=${session.candidateId}`,
        session.token,
        {
          method: "POST",
          body: JSON.stringify({ candidatePart: interviewData, complete }),
        },
      );
      toast.success(complete ? "חלק הראיון הושלם" : "טיוטה נשמרה");
      if (complete) {
        setInterview((current) =>
          current
            ? { ...current, candidate_part_completed_at: new Date().toISOString(), candidate_part: interviewData }
            : current,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <AgamPublicChrome>
        <p className="p-8 text-sm text-text-muted">טוען…</p>
      </AgamPublicChrome>
    );
  }

  if (!session) {
    return (
      <AgamPublicChrome>
        <div className="mx-auto max-w-md space-y-4 p-6">
          <div className={`${panelClass} space-y-4 p-6`}>
            <h1 className="text-2xl font-extrabold text-text-primary">פורטל מועמד</h1>
            <p className="text-sm text-text-secondary">
              הזינו מספר אישי וטלפון למילוי פרטים וחלק הראיון שלכם.
            </p>
            <input
              className={fieldClass}
              placeholder="מספר אישי"
              value={personalNumber}
              onChange={(event) => setPersonalNumber(event.target.value)}
              dir="ltr"
            />
            <input
              className={fieldClass}
              placeholder="טלפון"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              dir="ltr"
            />
            <button
              type="button"
              className={primaryButtonClass}
              disabled={verifying || personalNumber.trim().length < 2 || phone.trim().length < 7}
              onClick={() => void verify()}
            >
              {verifying ? "מאמת…" : "כניסה"}
            </button>
          </div>
        </div>
      </AgamPublicChrome>
    );
  }

  return (
    <AgamPublicChrome>
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <header className={`${panelClass} p-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">פורטל מועמד</p>
          <h1 className="mt-1 text-3xl font-extrabold text-text-primary">
            {candidate?.full_name ?? "מועמד"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary" dir="ltr">
            {candidate?.personal_number}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={tab === "profile" ? primaryButtonClass : secondaryButtonClass}
              onClick={() => setTab("profile")}
            >
              פרטי המועמד
            </button>
            <button
              type="button"
              className={tab === "interview" ? primaryButtonClass : secondaryButtonClass}
              onClick={() => setTab("interview")}
            >
              שאלון ראיון
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                sessionStorage.removeItem(STORAGE_KEY);
                setSession(null);
              }}
            >
              יציאה
            </button>
          </div>
        </header>

        {tab === "profile" ? (
          <div className="space-y-4">
            {profileSections.map(([num, section]) => {
              const visible = section.items.filter((question) =>
                isQuestionVisible(question, profileData),
              );
              if (visible.length === 0) return null;
              return (
                <section key={num} className={`${panelClass} space-y-4 p-5`}>
                  <h2 className="text-sm font-bold text-text-primary">{section.name}</h2>
                  {visible.map((question) => (
                    <AgamQuestionField
                      key={question.id}
                      question={question}
                      value={profileData[question.field_key] ?? ""}
                      onChange={(value) =>
                        setProfileData((current) => ({ ...current, [question.field_key]: value }))
                      }
                    />
                  ))}
                </section>
              );
            })}
            <button
              type="button"
              className={primaryButtonClass}
              disabled={saving}
              onClick={() => void saveProfile()}
            >
              {saving ? "שומר…" : "שמירת פרטים"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {interview?.candidate_part_completed_at ? (
              <p className="rounded-xl bg-[color:var(--agam-orange-soft)] px-4 py-3 text-sm font-bold text-text-primary">
                חלק הראיון שלכם הושלם. הממיין יוכל להמשיך מכאן.
              </p>
            ) : null}
            {interviewSections.length === 0 ? (
              <div className={`${panelClass} p-6 text-sm text-text-muted`}>
                אין שאלות ראיון למועמד כרגע. ניתן לשמור טיוטה ריקה או להמתין להגדרות המנהל.
              </div>
            ) : (
              interviewSections.map(([num, section]) => {
                const visible = section.items.filter((question) =>
                  isQuestionVisible(question, interviewData),
                );
                if (visible.length === 0) return null;
                return (
                  <section key={num} className={`${panelClass} space-y-4 p-5`}>
                    <h2 className="text-sm font-bold text-text-primary">{section.name}</h2>
                    {visible.map((question) => (
                      <AgamQuestionField
                        key={question.id}
                        question={question}
                        value={interviewData[question.field_key] ?? ""}
                        onChange={(value) =>
                          setInterviewData((current) => ({ ...current, [question.field_key]: value }))
                        }
                        disabled={Boolean(interview?.candidate_part_completed_at)}
                      />
                    ))}
                  </section>
                );
              })
            )}
            {!interview?.candidate_part_completed_at ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={saving}
                  onClick={() => void saveInterview(false)}
                >
                  שמירת טיוטה
                </button>
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={saving}
                  onClick={() => void saveInterview(true)}
                >
                  השלמת חלק הראיון
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AgamPublicChrome>
  );
}
