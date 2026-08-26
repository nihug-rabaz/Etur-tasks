export class ScoringEngine {
  /** Weighted score: sum of score(1-5) * weight(%), scaled to 1–100. Missing scores count as 0. */
  public static calcWeightedScore(
    scoresData: Record<string, number> | null | undefined,
    criteria: Array<{ key: string; weight: number }>,
  ): number | null {
    if (!criteria || criteria.length === 0) return null;
    const totalWeight = criteria.reduce((sum, criterion) => sum + (Number(criterion.weight) || 0), 0);
    if (!totalWeight) return null;
    const weightedSum = criteria.reduce(
      (sum, criterion) =>
        sum + (Number(scoresData?.[criterion.key]) || 0) * (Number(criterion.weight) || 0),
      0,
    );
    return Math.round((weightedSum / totalWeight) * 20);
  }

  public static defaultScores(criteria: Array<{ key: string }>): Record<string, number> {
    return Object.fromEntries(criteria.map((criterion) => [criterion.key, 3]));
  }
}
