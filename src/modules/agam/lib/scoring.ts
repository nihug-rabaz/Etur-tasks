export class ScoringEngine {
  public static calcWeightedScore(
    scoresData: Record<string, number> | null | undefined,
    criteria: Array<{ key: string; weight: number }>,
  ): number | null {
    if (!scoresData || criteria.length === 0) return null;
    let totalWeight = 0;
    let weightedSum = 0;
    for (const criterion of criteria) {
      const score = scoresData[criterion.key];
      if (typeof score !== "number" || criterion.weight <= 0) continue;
      totalWeight += criterion.weight;
      weightedSum += score * criterion.weight;
    }
    if (totalWeight === 0) return null;
    return Math.round((weightedSum / totalWeight) * 20);
  }
}
