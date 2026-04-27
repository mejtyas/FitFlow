import type { Json } from '@/lib/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

export function parseWorkoutExercisesFromForm(
  raw: string | null | undefined
):
  | { ok: true; exercises: { exercise_id: string; default_sets: number }[] }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, exercises: [] };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'Invalid exercises data' };
    }
    const exercises = parsed.map((e) => {
      const row = e as { exercise_id?: string; default_sets?: number };
      return {
        exercise_id: row.exercise_id ?? '',
        default_sets: row.default_sets ?? 2,
      };
    });
    return { ok: true, exercises };
  } catch {
    return { ok: false, error: 'Invalid exercises data' };
  }
}

export async function rpcReplaceWorkoutExercises(
  supabase: SupabaseClient,
  workoutId: string,
  exercises: { exercise_id: string; default_sets: number }[]
): Promise<{ error?: string }> {
  const payload: Json = exercises.map((e, i) => ({
    exercise_id: e.exercise_id,
    order_index: i,
    default_sets: e.default_sets ?? 2,
  }));

  const { error: rpcError } = await supabase.rpc('replace_workout_exercises', {
    p_workout_id: workoutId,
    p_exercises: payload,
  });

  if (rpcError) {
    return { error: rpcError.message };
  }
  return {};
}
