import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireAuthUser } from '@/lib/supabase/require-auth-user';
import { isValidUuid } from '@/lib/validation';

export async function requireAuthExerciseId(id: string): Promise<
  | { error: string }
  | { supabase: SupabaseClient; user: User }
> {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return { error: auth.error };
  }
  if (!isValidUuid(id)) {
    return { error: 'Invalid exercise' };
  }
  return { supabase: auth.supabase, user: auth.user };
}
