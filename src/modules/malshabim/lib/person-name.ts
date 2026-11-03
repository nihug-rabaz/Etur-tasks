/** Normalize person names for display/storage (spaces between words). */
export function normalizePersonName(value?: string | null): string {
  if (!value) return "";
  let name = value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  // CamelCase / PascalCase English: LiadRabinovitch → Liad Rabinovitch
  if (name && !/\s/.test(name) && /[a-z][A-Z]/.test(name)) {
    name = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  }
  // Hebrew glued first+last heuristic: insert space before a capital Latin tail, else leave
  return name;
}
