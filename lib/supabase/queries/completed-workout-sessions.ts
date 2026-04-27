import type { SupabaseClient } from '@supabase/supabase-js';

export function queryCompletedSessionsCount(
  supabase: SupabaseClient,
  userId: string
) {
  return supabase
    .from('workout_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('ended_at', 'is', null);
}

export function queryCompletedSessionDurations(
  supabase: SupabaseClient,
  userId: string,
  endedAtGteIso?: string
) {
  let q = supabase
    .from('workout_sessions')
    .select('started_at, ended_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null);
  if (endedAtGteIso) {
    q = q.gte('ended_at', endedAtGteIso);
  }
  return q;
}
