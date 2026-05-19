import type { SetRow } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { isLoggedSetReps } from '@/lib/validation';

export function parseSetFieldValue(
  field: 'kg' | 'reps',
  value: number | ''
): number | null {
  if (value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  if (field === 'reps' && !isLoggedSetReps(n)) {
    return null;
  }
  return n;
}

export function setHasLoggedRepsAndKg(kg: number | null, reps: number | null): boolean {
  return kg !== null && kg !== undefined && isLoggedSetReps(reps);
}

export function shouldAutoCompleteSetOnFieldChange(
  set: SetRow,
  field: 'kg' | 'reps',
  num: number | null
): boolean {
  const withField = { ...set, [field]: num };
  return (
    setHasLoggedRepsAndKg(withField.kg, withField.reps) &&
    !setHasLoggedRepsAndKg(set.kg, set.reps) &&
    !set.completed
  );
}
