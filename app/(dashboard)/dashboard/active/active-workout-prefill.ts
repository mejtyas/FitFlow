type SetRow = { id: string; kg: number | null | undefined };

export function followerSetIdsToPrefillKg(
  sorted: SetRow[],
  prevFirstKg: number | null
): string[] {
  return sorted
    .slice(1, 3)
    .filter(
      (s) =>
        s.kg === null ||
        s.kg === undefined ||
        (prevFirstKg !== null &&
          prevFirstKg !== undefined &&
          s.kg === prevFirstKg)
    )
    .map((s) => s.id);
}
