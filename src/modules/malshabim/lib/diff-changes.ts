const OBS_LABELS: Record<string, string> = {
  shabbat: "שמירת שבת",
  tefillin: "הנחת תפילין",
  prayers: "תפילות",
  kippah: "כיפה",
  kashrut: "כשרות",
};

const FIELD_LABELS: Record<string, string> = {
  full_name: "שם מלא",
  phone: "פלאפון",
  id_number: "ת.ז",
  personal_number: "מ.א",
  city: "מקום מגורים",
  enlistment_date: "תאריך גיוס",
  recruitment_track: "מסלול גיוס",
  status_type: "סטטוס אישי",
  candidate_status: "סטטוס",
  next_status_update_at: "מועד עדכון סטטוס",
  interview_at: "מועד ראיון",
  request_type: "איתור/בקשה",
  photo_url: "תמונה",
  interview_summary: "סיכום הראיון",
  instructions: "הנחיות",
  quiz_score: "ציון המבחן",
  quiz_passed: "תוצאת מבחן",
  interviewer_user_id: "מראיין",
};

const REQUEST_META_LABELS: Record<string, string> = {
  requester: "מבקש",
  unit: "יחידה",
  role: "תפקיד",
};

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "עבר ✓" : "לא עבר ✗";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    try {
      return new Date(value).toLocaleString("he-IL", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      /* fall through */
    }
  }
  return String(value);
}

type Diffable = Record<string, unknown> & {
  observance?: Record<string, { answer?: string; note?: string } | undefined>;
  quiz_questions?: Array<{ is_correct?: boolean }>;
  instruction_items?: unknown[];
  request_meta?: Record<string, unknown>;
};

export function computeChanges(oldData: Diffable | null, newData: Diffable): string[] {
  const changes: string[] = [];

  Object.keys(FIELD_LABELS).forEach((k) => {
    const a = oldData?.[k];
    const b = newData?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push(`${FIELD_LABELS[k]}: "${formatValue(a)}" → "${formatValue(b)}"`);
    }
  });

  const oldMeta = oldData?.request_meta || {};
  const newMeta = newData.request_meta || {};
  Object.keys(REQUEST_META_LABELS).forEach((k) => {
    const a = oldMeta[k];
    const b = newMeta[k];
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) {
      changes.push(`${REQUEST_META_LABELS[k]}: "${formatValue(a)}" → "${formatValue(b)}"`);
    }
  });

  const oldObs = oldData?.observance || {};
  const newObs = newData.observance || {};
  Object.keys(OBS_LABELS).forEach((k) => {
    const a = oldObs[k]?.answer;
    const b = newObs[k]?.answer;
    if (a !== b) {
      changes.push(`${OBS_LABELS[k]}: "${formatValue(a)}" → "${formatValue(b)}"`);
    }
    const aN = oldObs[k]?.note;
    const bN = newObs[k]?.note;
    if ((aN || "") !== (bN || "")) {
      changes.push(`הערה — ${OBS_LABELS[k]}: "${formatValue(aN)}" → "${formatValue(bN)}"`);
    }
  });

  const oldQuiz = oldData?.quiz_questions || [];
  const newQuiz = newData.quiz_questions || [];
  if (JSON.stringify(oldQuiz) !== JSON.stringify(newQuiz)) {
    const oldCorrect = oldQuiz.filter((q) => q.is_correct).length;
    const newCorrect = newQuiz.filter((q) => q.is_correct).length;
    changes.push(
      `תשובות מבחן: ${oldCorrect}/${oldQuiz.length} → ${newCorrect}/${newQuiz.length} נכונות`,
    );
  }

  if (
    JSON.stringify(oldData?.instruction_items) !== JSON.stringify(newData.instruction_items)
  ) {
    const oldCount = (oldData?.instruction_items || []).length;
    const newCount = (newData.instruction_items || []).length;
    changes.push(`הנחיות לביצוע עודכנו (${oldCount} → ${newCount} הנחיות)`);
  }

  return changes;
}
