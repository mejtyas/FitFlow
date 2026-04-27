import type { SupabaseClient, User } from '@supabase/supabase-js';
import { guardSessionExerciseInActiveSession } from '@/lib/workout-session/guard-session-exercise-in-active-session';
import { requireSessionMutationIds } from '@/lib/workout-session/require-session-mutation-ids';

export async function requireSessionExerciseMutationContext(
  workoutSessionId: string,
  sessionExerciseId: string
): Promise<
  | { error: string }
  | { supabase: SupabaseClient; user: User }
> {
  const ctx = await requireSessionMutationIds(
    workoutSessionId,
    sessionExerciseId
  );
  if (!('supabase' in ctx)) {
    return ctx;
  }
  const { supabase, user } = ctx;

  const guarded = await guardSessionExerciseInActiveSession(
    supabase,
    user.id,
    workoutSessionId,
    sessionExerciseId
  );
  if ('error' in guarded) {
    return guarded;
  }

  return { supabase, user };
}
