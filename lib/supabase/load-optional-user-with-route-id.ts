import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/supabase/get-authenticated-user';

export async function loadOptionalUserWithRouteId(
  params: Promise<{ id: string }>
): Promise<
  | null
  | { id: string; supabase: SupabaseClient; user: User }
> {
  const { id } = await params;
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return null;
  }
  return { id, ...auth };
}
