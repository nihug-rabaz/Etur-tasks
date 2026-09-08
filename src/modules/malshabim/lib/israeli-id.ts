/** Israeli ID (Teudat Zehut) checksum validation. */
export function validateIsraeliId(id: string | null | undefined): boolean {
  if (!id) return false;
  const s = String(id).padStart(9, "0");
  if (s.length !== 9 || !/^\d{9}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = Number(s[i]) * ((i % 2) + 1);
    if (val > 9) val -= 9;
    sum += val;
  }
  return sum % 10 === 0;
}
