import type { SupabaseClient } from '@supabase/supabase-js';
import { assertActiveSessionOwnedByUser } from '@/lib/workout-session/persist-session-sets';
import {
  expireRunningRestIfNeeded,
  insertRestPeriodStart,
  mapRowToClientState,
  REST_COLS,
  sealOpenRestPeriodsAt,
} from '@/lib/workout-session/session-rest-timer-db';
import type {
  RestTimerClientState,
  RestTimerOp,
  RestTimerRow,
} from '@/lib/workout-session/session-rest-timer-types';

export async function applyRestTimerOpForUser(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  op: RestTimerOp
): Promise<{ error: string } | { state: RestTimerClientState }> {
  const gate = await assertActiveSessionOwnedByUser(
    supabase,
    userId,
    sessionId
  );
  if (gate.error) {
    return { error: gate.error };
  }

  const { data: row, error: readErr } = await supabase
    .from('workout_sessions')
    .select(REST_COLS)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .is('ended_at', null)
    .single();

  if (readErr || !row) {
    return { error: readErr?.message ?? 'Session not found' };
  }

  const current = await expireRunningRestIfNeeded(
    supabase,
    userId,
    sessionId,
    row as RestTimerRow
  );

  const clearPayload = {
    rest_target_ms: null as number | null,
    rest_ends_at: null as string | null,
    rest_paused_remaining_ms: null as number | null,
  };

  if (op.kind === 'pull') {
    return { state: mapRowToClientState(current) };
  }

  if (op.kind === 'stop') {
    const nowIso = new Date().toISOString();
    await sealOpenRestPeriodsAt(supabase, sessionId, nowIso);
    const { data, error } = await supabase
      .from('workout_sessions')
      .update(clearPayload)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .is('ended_at', null)
      .select(REST_COLS)
      .single();
    if (error) {
      return { error: error.message };
    }
    return { state: mapRowToClientState((data ?? clearPayload) as RestTimerRow) };
  }

  if (op.kind === 'start') {
    const durationMs = Math.max(1000, Math.floor(op.durationMs));
    const nowIso = new Date().toISOString();
    await sealOpenRestPeriodsAt(supabase, sessionId, nowIso);
    const insErr = await insertRestPeriodStart(
      supabase,
      sessionId,
      durationMs,
      nowIso
    );
    if (insErr) {
      return { error: insErr.error };
    }
    const endsAt = new Date(Date.now() + durationMs).toISOString();
    const { data, error } = await supabase
      .from('workout_sessions')
      .update({
        rest_target_ms: durationMs,
        rest_ends_at: endsAt,
        rest_paused_remaining_ms: null,
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .is('ended_at', null)
      .select(REST_COLS)
      .single();
    if (error) {
      return { error: error.message };
    }
    return { state: mapRowToClientState((data as RestTimerRow) ?? current) };
  }

  if (op.kind === 'restart') {
    const target = current.rest_target_ms;
    if (target === null || target === undefined) {
      return { error: 'No rest target to restart' };
    }
    const nowIso = new Date().toISOString();
    await sealOpenRestPeriodsAt(supabase, sessionId, nowIso);
    const insErr = await insertRestPeriodStart(
      supabase,
      sessionId,
      target,
      nowIso
    );
    if (insErr) {
      return { error: insErr.error };
    }
    const endsAt = new Date(Date.now() + target).toISOString();
    const { data, error } = await supabase
      .from('workout_sessions')
      .update({
        rest_target_ms: target,
        rest_ends_at: endsAt,
        rest_paused_remaining_ms: null,
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .is('ended_at', null)
      .select(REST_COLS)
      .single();
    if (error) {
      return { error: error.message };
    }
    return { state: mapRowToClientState((data as RestTimerRow) ?? current) };
  }

  if (op.kind === 'pause') {
    if (
      current.rest_ends_at === null ||
      current.rest_ends_at === undefined ||
      current.rest_target_ms === null ||
      current.rest_target_ms === undefined
    ) {
      return { state: mapRowToClientState(current) };
    }
    const remaining = Math.max(
      0,
      Math.ceil(new Date(current.rest_ends_at).getTime() - Date.now())
    );
    const { data, error } = await supabase
      .from('workout_sessions')
      .update({
        rest_target_ms: current.rest_target_ms,
        rest_ends_at: null,
        rest_paused_remaining_ms: remaining,
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .is('ended_at', null)
      .select(REST_COLS)
      .single();
    if (error) {
      return { error: error.message };
    }
    return { state: mapRowToClientState((data as RestTimerRow) ?? current) };
  }

  if (op.kind === 'resume') {
    if (
      current.rest_paused_remaining_ms === null ||
      current.rest_paused_remaining_ms === undefined ||
      current.rest_target_ms === null ||
      current.rest_target_ms === undefined
    ) {
      return { state: mapRowToClientState(current) };
    }
    const rem = Math.max(0, current.rest_paused_remaining_ms);
    if (rem <= 0) {
      const nowIso = new Date().toISOString();
      await sealOpenRestPeriodsAt(supabase, sessionId, nowIso);
      const { data, error } = await supabase
        .from('workout_sessions')
        .update(clearPayload)
        .eq('id', sessionId)
        .eq('user_id', userId)
        .is('ended_at', null)
        .select(REST_COLS)
        .single();
      if (error) {
        return { error: error.message };
      }
      return {
        state: mapRowToClientState((data ?? clearPayload) as RestTimerRow),
      };
    }
    const endsAt = new Date(Date.now() + rem).toISOString();
    const { data, error } = await supabase
      .from('workout_sessions')
      .update({
        rest_target_ms: current.rest_target_ms,
        rest_ends_at: endsAt,
        rest_paused_remaining_ms: null,
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .is('ended_at', null)
      .select(REST_COLS)
      .single();
    if (error) {
      return { error: error.message };
    }
    return { state: mapRowToClientState((data as RestTimerRow) ?? current) };
  }

  return { error: 'Unsupported rest timer op' };
}
