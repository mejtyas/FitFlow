/**
 * Estimated one-rep max via Epley formula: kg × (1 + reps / 30).
 * Valid for typical strength-training rep ranges when the set is taken near failure.
 */
export function estimatedOneRmEpley(
  kg: number,
  reps: number
): number | null {
  if (!(kg > 0) || !(reps >= 1) || !Number.isFinite(kg) || !Number.isFinite(reps)) {
    return null;
  }
  return kg * (1 + reps / 30);
}
