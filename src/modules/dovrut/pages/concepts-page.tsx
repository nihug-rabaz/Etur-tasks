"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DovrutConcept, DovrutConceptType } from "@/modules/dovrut/types";
import {
  APPROVAL_STATUS_LABELS,
  DOMAIN_LABELS,
  WORK_STATUS_ARTICLE_LABELS,
  WORK_STATUS_SOCIAL_LABELS,
} from "@/modules/dovrut/lib/approval-flows";

export function DovrutConceptsPage() {
  const [concepts, setConcepts] = useState<DovrutConcept[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | DovrutConceptType>("all");

  const load = useCallback(async () => {
    const response = await fetch("/api/dovrut/concepts");
    const data = await response.json();
    setConcepts(Array.isArray(data.concepts) ? data.concepts : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return concepts.filter((concept) => {
      if (type !== "all" && concept.type !== type) return false;
      if (!q) return true;
      return (
        concept.name.toLowerCase().includes(q) ||
        (concept.project_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [concepts, query, type]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <h1 className="text-xl font-bold text-text-primary">קונספטים</h1>
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש"
          className="min-w-[200px] flex-1 rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none dark:bg-slate-800"
        />
        <select
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
          className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
        >
          <option value="all">הכל</option>
          <option value="article_interview">כתבות</option>
          <option value="social_media">רשתות</option>
        </select>
      </div>
      <ul className="space-y-2">
        {filtered.map((concept) => (
          <li key={concept.id}>
            <Link
              href={`/dovrut/concepts/${concept.id}`}
              className="block rounded-2xl border border-black/8 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161922]"
            >
              <p className="text-sm font-extrabold text-text-primary">{concept.name}</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {concept.project_name}
                {concept.domain ? ` · ${DOMAIN_LABELS[concept.domain]}` : ""} ·{" "}
                {concept.type === "article_interview"
                  ? concept.approval_status
                    ? APPROVAL_STATUS_LABELS[concept.approval_status]
                    : WORK_STATUS_ARTICLE_LABELS[concept.work_status_article ?? ""]
                  : WORK_STATUS_SOCIAL_LABELS[concept.work_status_social ?? ""]}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
