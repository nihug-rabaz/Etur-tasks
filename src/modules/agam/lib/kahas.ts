export const KAHAS_OPTIONS = [40, 41, 42, 43] as const;

export type AgamKahas = (typeof KAHAS_OPTIONS)[number];

export function isKahas(value: unknown): value is AgamKahas {
  return typeof value === "number" && (KAHAS_OPTIONS as readonly number[]).includes(value);
}
