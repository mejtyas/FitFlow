import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { isLoggedSetReps } from '@/lib/validation';

type TypedSupabase = SupabaseClient<Database>;

/** Removes sets without valid reps so unfinished rows do not appear in history. */
export async function purgeInvalidSessionSets(
  supabase: TypedSupabase,
  workoutSessionId: string
): Promise<{ error?: string }> {
  const { data: exercises, error: exErr } = await supabase
    .from('session_exercises')
    .select('session_sets(id, reps)')
    .eq('workout_session_id', workoutSessionId);

  if (exErr) {
    return { error: exErr.message };
  }

  const ids = (exercises ?? []).flatMap((ex) => {
    const sets =
      (ex.session_sets as { id: string; reps: number | null }[] | null) ?? [];
    return sets.filter((s) => !isLoggedSetReps(s.reps)).map((s) => s.id);
  });

  if (ids.length === 0) {
    return {};
  }

  const { error } = await supabase.from('session_sets').delete().in('id', ids);
  if (error) {
    return { error: error.message };
  }
  return {};
}
