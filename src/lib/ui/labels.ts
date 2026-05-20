const subtopicLabelMap: Record<string, string> = {
  Officers: "קצינים",
  NCOs: "נגדים",
  Candidates: "מלש״בים",
  PR: "יח״צ",
  "Social Media": "סושיאל",
  Visits: "ביקורים",
  General: "כללי",
};

export function toHebrewSubtopicLabel(name: string): string {
  return subtopicLabelMap[name] ?? name;
}
