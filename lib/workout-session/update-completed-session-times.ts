import type { SupabaseClient } from '@supabase/supabase-js';

type UpdateCompletedTimesInput = { startedAt: string; endedAt: string };

type UpdateCompletedTimesResult =
  | { error: string }
  | { ok: true };

/** Shared DB logic for editing a completed session’s start/end timestamps. */
export async function updateCompletedSessionTimesForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  times: UpdateCompletedTimesInput
): Promise<UpdateCompletedTimesResult> {
  const startMs = new Date(times.startedAt).getTime();
  const endMs = new Date(times.endedAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return { error: 'Invalid date.' };
  }
  if (endMs <= startMs) {
    return { error: 'End time must be after start time.' };
  }

  const { data: existing } = await supabase
    .from('workout_sessions')
    .select('id, ended_at')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (!existing) {return { error: 'Session not found or access denied' };}
  if (!existing.ended_at) {
    return { error: 'Only completed sessions can be edited here.' };
  }

  const { error } = await supabase
    .from('workout_sessions')
    .update({
      started_at: times.startedAt,
      ended_at: times.endedAt,
    })
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {return { error: error.message };}
  return { ok: true };
}
