import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { sanitizeWorkoutExerciseName } from '@/lib/validation';

export async function requireUserAndWorkoutFormName(formData: FormData): Promise<
  | { error: string }
  | { supabase: SupabaseClient; user: User; name: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const name = sanitizeWorkoutExerciseName(formData.get('name') as string);
  if (!name) {
    return { error: 'Name is required' };
  }
  return { supabase, user, name };
}
