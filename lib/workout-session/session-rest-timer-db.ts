import type { SupabaseClient } from '@supabase/supabase-js';
import { assertActiveSessionOwnedByUser } from '@/lib/workout-session/persist-session-sets';
import type { RestTimerClientState, RestTimerRow } from '@/lib/workout-session/session-rest-timer-types';

export const REST_COLS =
  'rest_target_ms, rest_ends_at, rest_paused_remaining_ms' as const;

export async function sealOpenRestPeriodsAt(
  supabase: SupabaseClient,
  sessionId: string,
  endedAtIso: string
): Promise<void> {
  await supabase
    .from('session_rest_periods')
    .update({ ended_at: endedAtIso })
    .eq('workout_session_id', sessionId)
    .is('ended_at', null);
}

export async function insertRestPeriodStart(
  supabase: SupabaseClient,
  sessionId: string,
  plannedTargetMs: number,
  startedAtIso: string
): Promise<{ error: string } | undefined> {
  const { error } = await supabase.from('session_rest_periods').insert({
    workout_session_id: sessionId,
    planned_target_ms: plannedTargetMs,
    started_at: startedAtIso,
    ended_at: null,
  });
  if (error) {
    return { error: error.message };
  }
  return undefined;
}

export function mapRowToClientState(row: RestTimerRow): RestTimerClientState {
  const target = row.rest_target_ms;
  if (target === null || target === undefined) {
    return {
      targetMs: null,
      remainingMs: 0,
      paused: false,
      endsAtIso: null,
    };
  }

  if (
    row.rest_paused_remaining_ms !== null &&
    row.rest_paused_remaining_ms !== undefined &&
    (row.rest_ends_at === null || row.rest_ends_at === undefined)
  ) {
    return {
      targetMs: target,
      remainingMs: Math.max(0, row.rest_paused_remaining_ms),
      paused: true,
      endsAtIso: null,
    };
  }

  if (row.rest_ends_at) {
    const remaining = Math.max(
      0,
      Math.ceil(new Date(row.rest_ends_at).getTime() - Date.now())
    );
    return {
      targetMs: target,
      remainingMs: remaining,
      paused: false,
      endsAtIso: row.rest_ends_at,
    };
  }

  return {
    targetMs: null,
    remainingMs: 0,
    paused: false,
    endsAtIso: null,
  };
}

/** Clear running rest if deadline passed; returns latest row. */
export async function expireRunningRestIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  row: RestTimerRow
): Promise<RestTimerRow> {
  if (
    row.rest_ends_at === null ||
    row.rest_ends_at === undefined ||
    (row.rest_paused_remaining_ms !== null &&
      row.rest_paused_remaining_ms !== undefined) ||
    row.rest_target_ms === null ||
    row.rest_target_ms === undefined
  ) {
    return row;
  }
  if (new Date(row.rest_ends_at).getTime() > Date.now()) {
    return row;
  }

  await sealOpenRestPeriodsAt(supabase, sessionId, row.rest_ends_at);

  const { data, error } = await supabase
    .from('workout_sessions')
    .update({
      rest_target_ms: null,
      rest_ends_at: null,
      rest_paused_remaining_ms: null,
    })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .is('ended_at', null)
    .select(REST_COLS)
    .single();

  if (error || !data) {
    return {
      rest_target_ms: null,
      rest_ends_at: null,
      rest_paused_remaining_ms: null,
    };
  }
  return data as RestTimerRow;
}

export async function readRestTimerStateForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<{ error: string } | { state: RestTimerClientState }> {
  const gate = await assertActiveSessionOwnedByUser(
    supabase,
    userId,
    sessionId
  );
  if (gate.error) {
    return { error: gate.error };
  }

  const { data, error } = await supabase
    .from('workout_sessions')
    .select(REST_COLS)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .is('ended_at', null)
    .single();

  if (error || !data) {
    return { error: error?.message ?? 'Session not found' };
  }

  const cleared = await expireRunningRestIfNeeded(
    supabase,
    userId,
    sessionId,
    data as RestTimerRow
  );
  return { state: mapRowToClientState(cleared) };
}
