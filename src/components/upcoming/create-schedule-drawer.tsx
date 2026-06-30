"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, MapPin, Plus, Users } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { AssigneeMultiSelect, type AssigneeOption } from "@/components/ui/assignee-select";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

interface OptionItem {
  id: string;
  name: string;
}

interface CreateScheduleDrawerProps {
  defaultDayKey?: string;
  triggerLabel?: string;
}

const fieldClass =
  "w-full rounded-2xl border border-border-weak bg-surface-2/50 px-4 py-3 text-sm text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition placeholder:text-text-muted focus:border-accent-primary/55 focus:bg-surface-1 focus:ring-2 focus:ring-accent-primary/22";

function toDatetimeLocalValue(dayKey: string, hour = 9): string {
  return `${dayKey}T${String(hour).padStart(2, "0")}:00`;
}

export function CreateScheduleDrawer({
  defaultDayKey,
  triggerLabel = "לו״ז / פגישה",
}: CreateScheduleDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subtopics, setSubtopics] = useState<OptionItem[]>([]);
  const [users, setUsers] = useState<AssigneeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [subtopicId, setSubtopicId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const dayKey = useMemo(() => defaultDayKey ?? new Date().toISOString().slice(0, 10), [defaultDayKey]);

  useEffect(() => {
    if (!open) return;
    setStartsAt(toDatetimeLocalValue(dayKey, 9));
    setEndsAt(toDatetimeLocalValue(dayKey, 10));
    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const response = await fetch("/api/create-options", { credentials: "include" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setSubtopics([]);
          setUsers([]);
          return;
        }
        setSubtopics(data.subtopics ?? []);
        setUsers(
          (data.users ?? []).map((u: { id: string; name: string; avatar?: string | null }) => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar ?? null,
          })),
        );
        const nextSubtopics = data.subtopics ?? [];
        setSubtopicId((current) => {
          if (current && nextSubtopics.some((item: OptionItem) => item.id === current)) return current;
          return nextSubtopics[0]?.id ?? "";
        });
      } finally {
        setOptionsLoading(false);
      }
    };
    void loadOptions();
  }, [open, dayKey]);

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) {
      setError("נדרשת כותרת ללו״ז");
      return;
    }
    if (!subtopicId) {
      setError("יש לבחור תת-נושא");
      return;
    }
    if (!startsAt) {
      setError("יש לבחור מועד התחלה");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        subtopicId,
        participantIds,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        allDay,
        description: description.trim() || null,
        location: location.trim() || null,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError("לא הצלחנו לשמור את הלו״ז");
      return;
    }
    toast.success("הלו״ז נשמר והתראות נשלחו");
    setOpen(false);
    setTitle("");
    setDescription("");
    setLocation("");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.55)] transition hover:brightness-105"
      >
        <Plus size={16} />
        {triggerLabel}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="לו״ז / פגישה חדשה"
        subtitle="אירוע שאינו משימה — יופיע בלוח וישלח התראות למשתתפים"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-text-muted">כותרת</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="פגישת צוות, שיחה, אירוע…"
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-text-muted">תת-נושא</label>
            <select
              value={subtopicId}
              onChange={(event) => setSubtopicId(event.target.value)}
              disabled={optionsLoading}
              className={fieldClass}
            >
              <option value="">בחר תת-נושא</option>
              {subtopics.map((item) => (
                <option key={item.id} value={item.id}>
                  {toHebrewSubtopicLabel(item.name)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
                <CalendarClock size={13} />
                התחלה
              </label>
              <input
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? startsAt.slice(0, 10) : startsAt}
                onChange={(event) => setStartsAt(allDay ? `${event.target.value}T09:00` : event.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-text-muted">סיום</label>
              <input
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? (endsAt ? endsAt.slice(0, 10) : "") : endsAt}
                onChange={(event) => setEndsAt(allDay ? `${event.target.value}T18:00` : event.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary">
            <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} />
            כל היום
          </label>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
              <MapPin size={13} />
              מיקום
            </label>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="חדר, זום, כתובת…"
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-text-muted">תיאור</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className={`${fieldClass} resize-y`}
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
              <Users size={13} />
              משתתפים
            </label>
            <AssigneeMultiSelect value={participantIds} onChange={setParticipantIds} users={users} menuMinWidth={360} />
          </div>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border-weak px-4 py-2.5 text-sm font-semibold">
              ביטול
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? "שומר…" : "שמירת לו״ז"}
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
