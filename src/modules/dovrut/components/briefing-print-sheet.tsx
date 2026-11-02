"use client";

import type { DovrutAudienceMessage, DovrutConcept } from "@/modules/dovrut/types";
import { DOMAIN_LABELS } from "@/modules/dovrut/lib/approval-flows";

export type BriefingIntervieweeRow = {
  name: string;
  title: string | null;
  paragraph: string | null;
};

export function BriefingPrintSheet({
  concept,
  notes,
  openedBy,
  interviewees,
  messages,
}: {
  concept: DovrutConcept;
  notes: string;
  openedBy: string;
  interviewees: BriefingIntervieweeRow[];
  messages: DovrutAudienceMessage[];
}) {
  const printedAt = new Date().toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const domains = (concept.domains?.length
    ? concept.domains
    : concept.domain
      ? [concept.domain]
      : []
  ).map((d) => DOMAIN_LABELS[d] ?? d);
  const audiences = concept.target_audiences?.length
    ? concept.target_audiences
    : concept.target_audience
      ? [concept.target_audience]
      : [];

  return (
    <section className="briefing-print" dir="rtl">
      <header className="briefing-print__brand">
        <div className="briefing-print__brand-text">
          <p className="briefing-print__brand-kicker">מסמך רשמי ממערכת</p>
          <h2 className="briefing-print__brand-title">מדור אומץ</h2>
          <p className="briefing-print__brand-sub">
            רבנות צבאית · מערכת ניהול משימות · מודול דוברות
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mador-omtz.png"
          alt="לוגו מדור אומץ"
          className="briefing-print__brand-logo"
        />
      </header>

      <header className="briefing-print__hero">
        <div className="briefing-print__hero-top">
          <div>
            <p className="briefing-print__eyebrow">דוברות · דף תדרוך</p>
            <h1 className="briefing-print__title">{concept.name}</h1>
          </div>
          <div className="briefing-print__badge">תדרוך</div>
        </div>
        <div className="briefing-print__meta">
          {concept.project_name ? (
            <span className="briefing-print__chip briefing-print__chip--teal">
              פרויקט: {concept.project_name}
            </span>
          ) : null}
          {concept.media_outlet ? (
            <span className="briefing-print__chip briefing-print__chip--amber">
              מערכת: {concept.media_outlet}
            </span>
          ) : null}
          {domains.map((label) => (
            <span key={label} className="briefing-print__chip briefing-print__chip--navy">
              {label}
            </span>
          ))}
          {audiences.map((label) => (
            <span key={label} className="briefing-print__chip briefing-print__chip--rose">
              קהל: {label}
            </span>
          ))}
        </div>
        <div className="briefing-print__byline">
          <span>
            פותח ע״י <strong>{openedBy || "משתמש המערכת"}</strong>
          </span>
          <span className="briefing-print__byline-sep">·</span>
          <span>{printedAt}</span>
          {concept.interviewer ? (
            <>
              <span className="briefing-print__byline-sep">·</span>
              <span>מראיין: {concept.interviewer}</span>
            </>
          ) : null}
        </div>
      </header>

      {concept.details?.trim() ? (
        <section className="briefing-print__card briefing-print__card--details">
          <h2 className="briefing-print__h2">פרטי האייטם</h2>
          <p className="briefing-print__body">{concept.details}</p>
        </section>
      ) : null}

      {notes.trim() ? (
        <section className="briefing-print__card briefing-print__card--notes">
          <h2 className="briefing-print__h2">הערות / דגשים לתדרוך</h2>
          <p className="briefing-print__body">{notes}</p>
        </section>
      ) : null}

      {interviewees.length > 0 ? (
        <section className="briefing-print__block">
          <h2 className="briefing-print__section-title">מרואיינים</h2>
          <div className="briefing-print__stack">
            {interviewees.map((row, index) => (
              <article key={`${row.name}-${index}`} className="briefing-print__person">
                <div className="briefing-print__person-head">
                  <span className="briefing-print__person-index">{index + 1}</span>
                  <div>
                    <p className="briefing-print__person-name">{row.name}</p>
                    {row.title ? (
                      <p className="briefing-print__person-role">{row.title}</p>
                    ) : null}
                  </div>
                </div>
                {row.paragraph ? (
                  <p className="briefing-print__body">{row.paragraph}</p>
                ) : (
                  <p className="briefing-print__muted">לא נמצא כרטיס גורם תחקור תואם.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {messages.length > 0 ? (
        <section className="briefing-print__block">
          <h2 className="briefing-print__section-title">מסרים</h2>
          <div className="briefing-print__stack">
            {messages.map((row) => (
              <article key={row.id} className="briefing-print__message">
                <p className="briefing-print__message-title">{row.title}</p>
                {row.body ? <p className="briefing-print__body">{row.body}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="briefing-print__footer">
        הופק ממערכת מדור אומץ · מודול דוברות · מסמך תדרוך פנימי
      </footer>
    </section>
  );
}
