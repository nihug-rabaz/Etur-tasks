"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dovrutFetch } from "@/modules/dovrut/lib/dovrut-fetch";
import { useDovrutMutatedReload } from "@/modules/dovrut/lib/use-dovrut-reload";
import type { DovrutConcept } from "@/modules/dovrut/types";
import {
  APPROVAL_STATUS_LABELS,
  DOMAIN_LABELS,
  WORK_STATUS_LABELS,
} from "@/modules/dovrut/lib/approval-flows";

export function DovrutConceptsPage() {
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [draftsOnly, setDraftsOnly] = useState(false);

  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (draftsOnly) params.set("scope", "drafts");
      else if (activeOnly) params.set("activeOnly", "1");
      const data = await dovrutFetch<{ concepts: DovrutConcept[] }>(
        `/api/dovrut/concepts?${params.toString()}`,
      );
      setConcepts(data.concepts);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    }
  }, [activeOnly, draftsOnly]);

  useEffect(() => {
    void load();
  }, [load]);
  useDovrutMutatedReload(load);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return concepts;
    return concepts.filter(
      (concept) =>
        concept.name.toLowerCase().includes(q) ||
        (concept.project_name ?? "").toLowerCase().includes(q) ||
        (concept.interviewer ?? "").toLowerCase().includes(q) ||
        (concept.media_outlet ?? "").toLowerCase().includes(q),
    );
  }, [concepts, query]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">אייטמים</h1>
          <p className="mt-1 text-sm text-text-muted">כתבות, ראיונות ורשתות</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-bold">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => {
                setActiveOnly(e.target.checked);
                if (e.target.checked) setDraftsOnly(false);
              }}
            />
            פעילים בלבד
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draftsOnly}
              onChange={(e) => {
                setDraftsOnly(e.target.checked);
                if (e.target.checked) setActiveOnly(false);
              }}
            />
            טיוטות
          </label>
        </div>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="חיפוש לפי שם, מערכת, מראיין…"
        className="rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
      />
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      <ul className="space-y-2">
        {filtered.map((concept) => (
          <li key={concept.id}>
            <Link
              href={`/dovrut/items/${concept.id}`}
              className="block rounded-xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
            >
              <p className="text-sm font-bold text-text-primary">{concept.name}</p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {concept.project_name}
                {concept.domain ? ` · ${DOMAIN_LABELS[concept.domain]}` : ""}
                {concept.media_outlet ? ` · מערכת: ${concept.media_outlet}` : ""}
                {concept.interviewer ? ` · מראיין: ${concept.interviewer}` : ""}
                {" · "}
                {concept.type === "article_interview"
                  ? concept.approval_status
                    ? APPROVAL_STATUS_LABELS[concept.approval_status]
                    : WORK_STATUS_LABELS[concept.work_status_article ?? "planning"]
                  : WORK_STATUS_LABELS[concept.work_status_social ?? "planning"]}
              </p>
            </Link>
          </li>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">אין אייטמים</p>
        ) : null}
      </ul>
    </div>
  );
}
