import type { SupabaseClient } from '@supabase/supabase-js';
import { applyRestTimerOpForUser } from '@/lib/workout-session/session-rest-timer-apply';
import {
  readRestTimerStateForUser,
  sealOpenRestPeriodsAt,
} from '@/lib/workout-session/session-rest-timer-db';
import type { RestTimerClientState } from '@/lib/workout-session/session-rest-timer-types';

export type {
  RestTimerClientState,
  RestTimerOp,
} from '@/lib/workout-session/session-rest-timer-types';

export { applyRestTimerOpForUser };

/** When the workout ends, close any rest segment left open (skipped natural completion). */
export async function closeOpenRestPeriodsForSessionEnd(
  supabase: SupabaseClient,
  sessionId: string,
  endedAtIso: string
): Promise<void> {
  await sealOpenRestPeriodsAt(supabase, sessionId, endedAtIso);
}

export async function hydrateRestTimerForSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<RestTimerClientState> {
  const r = await readRestTimerStateForUser(supabase, userId, sessionId);
  if ('error' in r) {
    return {
      targetMs: null,
      remainingMs: 0,
      paused: false,
      endsAtIso: null,
    };
  }
  return r.state;
}
