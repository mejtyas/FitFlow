'use server';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function requireAuthUser(): Promise<
  | { ok: false; error: string }
  | { ok: true; supabase: SupabaseClient; user: User }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Unauthorized' };
  }
  return { ok: true, supabase, user };
}
