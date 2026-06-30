export function normalizeSubtopicIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export function primarySubtopicId(ids: string[]): string {
  return normalizeSubtopicIds(ids)[0] ?? "";
}

export function intersectsSubtopicIds(left: string[], right: string[]): boolean {
  const lookup = new Set(right);
  return left.some((id) => lookup.has(id));
}
