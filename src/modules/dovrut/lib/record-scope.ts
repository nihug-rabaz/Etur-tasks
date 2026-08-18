export const DOVRUT_LIST_SCOPES = ["working", "drafts", "archived", "deleted"] as const;

export type DovrutListScope = (typeof DOVRUT_LIST_SCOPES)[number];

export function parseDovrutListScope(searchParams: URLSearchParams): DovrutListScope {
  const explicit = searchParams.get("scope");
  if (explicit === "working" || explicit === "drafts" || explicit === "archived" || explicit === "deleted") {
    return explicit;
  }
  if (searchParams.get("deleted") === "1") return "deleted";
  if (searchParams.get("drafts") === "1") return "drafts";
  if (searchParams.get("archived") === "1") return "archived";
  return "working";
}

export function isDovrutListScope(value: string): value is DovrutListScope {
  return (DOVRUT_LIST_SCOPES as readonly string[]).includes(value);
}
