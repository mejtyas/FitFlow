'use server';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireAuthUser } from '@/lib/supabase/require-auth-user';
import { isValidUuid } from '@/lib/validation';

/** Authenticated user + session UUID gate (single session id param). */
export async function requireAuthForSessionId(sessionId: string): Promise<
  | { error: string }
  | { supabase: SupabaseClient; user: User }
> {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return { error: auth.error };
  }
  if (!isValidUuid(sessionId)) {
    return { error: 'Invalid session' };
  }
  return { supabase: auth.supabase, user: auth.user };
}
