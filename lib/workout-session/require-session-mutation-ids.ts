import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireAuthUser } from '@/lib/supabase/require-auth-user';
import { isValidUuid } from '@/lib/validation';

/** Shared auth + UUID gate for session-scoped mutations (two id parameters). */
export async function requireSessionMutationIds(
  workoutSessionId: string,
  otherEntityId: string
): Promise<
  | { error: string }
  | { supabase: SupabaseClient; user: User }
> {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return { error: auth.error };
  }
  if (!isValidUuid(workoutSessionId) || !isValidUuid(otherEntityId)) {
    return { error: 'Invalid id' };
  }
  return { supabase: auth.supabase, user: auth.user };
}
