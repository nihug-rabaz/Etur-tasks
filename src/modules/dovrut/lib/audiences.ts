export const DOVRUT_AUDIENCES = ["כללי", "חרדים", "דתיים", "מסורתיים"] as const;

export type DovrutAudience = (typeof DOVRUT_AUDIENCES)[number];

export function isDovrutAudience(value: string): value is DovrutAudience {
  return (DOVRUT_AUDIENCES as readonly string[]).includes(value);
}
