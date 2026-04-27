import {
  sanitizeDescription,
  sanitizeExerciseName,
} from '@/lib/validation';

export function parseExerciseFormNameDescription(formData: FormData):
  | { ok: false; error: string }
  | {
      ok: true;
      name: string;
      description: string | null;
    } {
  const name = sanitizeExerciseName(formData.get('name') as string);
  if (!name) {
    return { ok: false, error: 'Name is required' };
  }
  const description = sanitizeDescription(
    (formData.get('description') as string) ?? null
  );
  return { ok: true, name, description };
}
