// lib/analytics/zscore.ts

/**
 * Calculate z-scores for an array of numbers
 */
export function calculateZScores(values: number[]): number[] {
  if (values.length === 0) return [];

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return values.map(() => 0);

  return values.map((v) => (v - mean) / stddev);
}

/**
 * Calculate z-score for a single value given historical values
 */
export function calculateZScore(value: number, historicalValues: number[]): number {
  if (historicalValues.length < 2) return 0;
  const mean =
    historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
  const variance =
    historicalValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    historicalValues.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return 0;
  return (value - mean) / stddev;
}
