/** Normalize Supabase joined `workouts` (row or array) to a display name. */
export function workoutNameFromRelation(workouts: unknown): string {
  if (!workouts) {
    return 'Session';
  }
  if (Array.isArray(workouts)) {
    const n = (workouts[0] as { name?: string } | undefined)?.name;
    return n?.trim() || 'Session';
  }
  if (typeof workouts === 'object' && workouts !== null && 'name' in workouts) {
    const n = (workouts as { name?: string }).name;
    return n?.trim() || 'Session';
  }
  return 'Session';
}
