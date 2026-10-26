export type WaitlistEntryLike = {
  id: string;
  full_name: string;
  phone: string;
};

export function phoneDigits(value?: string | null): string {
  return (value || "").replace(/\D/g, "");
}

/** Compare Israeli mobiles ignoring a single leading 0 (050… vs 50…). */
export function phonesMatch(
  a?: string | null,
  b?: string | null,
): boolean {
  const left = phoneDigits(a);
  const right = phoneDigits(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const stripLeadingZero = (value: string) =>
    value.length === 10 && value.startsWith("0") ? value.slice(1) : value;
  return stripLeadingZero(left) === stripLeadingZero(right);
}

/** Match waitlist entries by phone digits only (never by name). */
export function findWaitlistByPhone(
  entries: WaitlistEntryLike[],
  phone?: string | null,
): WaitlistEntryLike | null {
  if (!phoneDigits(phone)) return null;
  return entries.find((entry) => phonesMatch(entry.phone, phone)) || null;
}
