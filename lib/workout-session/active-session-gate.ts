import type { SupabaseClient } from '@supabase/supabase-js';
import { assertActiveSessionOwnedByUser } from '@/lib/workout-session/persist-session-sets';

/** Returns `{ error }` when the session is not active / not owned; otherwise `null`. */
export async function activeSessionGateOrError(
  supabase: SupabaseClient,
  userId: string,
  workoutSessionId: string
): Promise<{ error: string } | null> {
  const gate = await assertActiveSessionOwnedByUser(
    supabase,
    userId,
    workoutSessionId
  );
  if (gate.error) {
    return { error: gate.error };
  }
  return null;
}
