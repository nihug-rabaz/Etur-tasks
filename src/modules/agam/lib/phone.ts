export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function phonesMatch(
  stored: string | null | undefined,
  provided: string | null | undefined,
): boolean {
  const a = normalizePhone(stored);
  const b = normalizePhone(provided);
  if (!a || !b) return false;
  return a === b;
}
