/** Basic UUID v4 check (Supabase uses UUID). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return typeof id === 'string' && UUID_RE.test(id.trim());
}

const MAX_KG = 9999;
const MAX_REPS = 9999;
const MAX_NAME_LEN = 100;
const MAX_DESC_LEN = 2000;

export function clampKg(
  value: number | null | undefined
): number | null | undefined {
  if (value === undefined) {return undefined;}
  if (value === null) {return null;}
  if (!Number.isFinite(value)) {return null;}
  const n = Math.round(value * 100) / 100;
  if (n < 0 || n > MAX_KG) {return Math.min(MAX_KG, Math.max(0, n));}
  return n;
}

/** A set counts as logged only when reps are at least 1. */
export function isLoggedSetReps(
  reps: number | null | undefined
): reps is number {
  return typeof reps === 'number' && Number.isFinite(reps) && reps >= 1;
}

export function clampReps(
  value: number | null | undefined
): number | null | undefined {
  if (value === undefined) {return undefined;}
  if (value === null) {return null;}
  if (!Number.isFinite(value)) {return null;}
  const n = Math.round(value * 2) / 2;
  if (n < 1) {return null;}
  if (n > MAX_REPS) {return MAX_REPS;}
  return n;
}

export function sanitizeWorkoutExerciseName(raw: string): string | null {
  const s = raw.trim();
  if (!s) {return null;}
  return s.slice(0, MAX_NAME_LEN);
}

export function sanitizeExerciseName(raw: string): string | null {
  const s = raw.trim();
  if (!s) {return null;}
  return s.slice(0, MAX_NAME_LEN);
}

export function sanitizeDescription(
  raw: string | null | undefined
): string | null {
  if (raw === null || raw === undefined) {return null;}
  const s = raw.trim();
  if (!s) {return null;}
  return s.slice(0, MAX_DESC_LEN);
}
