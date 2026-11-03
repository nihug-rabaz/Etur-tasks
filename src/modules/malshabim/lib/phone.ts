/** Normalize Israeli-ish phone strings for duplicate comparison. */
export function normalizePhoneDigits(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("972")) return digits.slice(3);
  return digits;
}

export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizePhoneDigits(a);
  const right = normalizePhoneDigits(b);
  if (!left || !right) return false;
  return left === right;
}
