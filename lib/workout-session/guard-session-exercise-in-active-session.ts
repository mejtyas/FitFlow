import type { SupabaseClient } from '@supabase/supabase-js';
import { verifySessionExerciseBelongsToSession } from '@/lib/workout-session/persist-session-sets';
import { activeSessionGateOrError } from '@/lib/workout-session/active-session-gate';

export async function guardSessionExerciseInActiveSession(
  supabase: SupabaseClient,
  userId: string,
  workoutSessionId: string,
  sessionExerciseId: string
): Promise<{ error: string } | { ok: true }> {
  const gate = await activeSessionGateOrError(
    supabase,
    userId,
    workoutSessionId
  );
  if (gate) {
    return gate;
  }

  const seOk = await verifySessionExerciseBelongsToSession(
    supabase,
    sessionExerciseId,
    workoutSessionId
  );
  if (!seOk) {
    return { error: 'Session exercise not found' };
  }
  return { ok: true };
}
