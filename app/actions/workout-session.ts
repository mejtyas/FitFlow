'use server';

import { revalidatePath } from 'next/cache';
import { createWorkoutSession } from '@/lib/create-workout-session';
import { updateCompletedSessionTimesForUser } from '@/lib/workout-session/update-completed-session-times';
import {
  applyRestTimerOpForUser,
  closeOpenRestPeriodsForSessionEnd,
  type RestTimerClientState,
  type RestTimerOp,
} from '@/lib/workout-session/session-rest-timer';
import { requireAuthForSessionId } from '@/lib/supabase/require-auth-for-session';
import { requireAuthUser } from '@/lib/supabase/require-auth-user';
import { isValidUuid } from '@/lib/validation';

export async function startWorkout(workoutId: string | null) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user } = auth;
  if (
    workoutId !== null &&
    workoutId !== undefined &&
    !isValidUuid(workoutId)
  ) {
    return { error: 'Invalid workout' };
  }

  const result = await createWorkoutSession(supabase, user.id, workoutId);

  if ('error' in result) {
    if (
      result.error === 'active_session_exists' &&
      'existingSessionId' in result
    ) {
      return {
        error: result.error,
        existingSessionId: result.existingSessionId,
      };
    }
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/active');
  return { sessionId: result.sessionId };
}

export type StartWorkoutResult = Awaited<ReturnType<typeof startWorkout>>;

export async function endWorkout(sessionId: string) {
  const gate = await requireAuthForSessionId(sessionId);
  if (!('supabase' in gate)) {
    return gate;
  }
  const { supabase, user } = gate;

  const endedAt = new Date().toISOString();

  await closeOpenRestPeriodsForSessionEnd(supabase, sessionId, endedAt);

  const restClear = {
    ended_at: endedAt,
    rest_target_ms: null as number | null,
    rest_ends_at: null as string | null,
    rest_paused_remaining_ms: null as number | null,
  };

  const { error: primaryErr } = await supabase
    .from('workout_sessions')
    .update(restClear)
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .is('ended_at', null);

  if (primaryErr) {
    return { error: primaryErr.message };
  }

  const { error: zombieErr } = await supabase
    .from('workout_sessions')
    .update(restClear)
    .eq('user_id', user.id)
    .is('ended_at', null);

  if (zombieErr) {
    return { error: zombieErr.message };
  }
  revalidatePath('/dashboard');
  revalidatePath('/history');
  revalidatePath('/dashboard/active');
  return {};
}

async function syncSessionRestTimer(
  sessionId: string,
  op: RestTimerOp
): Promise<{ error?: string; state?: RestTimerClientState }> {
  const gate = await requireAuthForSessionId(sessionId);
  if (!('supabase' in gate)) {
    return gate;
  }
  const { supabase, user } = gate;

  const result = await applyRestTimerOpForUser(
    supabase,
    user.id,
    sessionId,
    op
  );
  if ('error' in result) {
    return { error: result.error };
  }
  if (op.kind !== 'pull') {
    revalidatePath('/dashboard/active');
  }
  return { state: result.state };
}

async function updateCompletedSessionTimes(
  sessionId: string,
  times: { startedAt: string; endedAt: string }
) {
  const gate = await requireAuthForSessionId(sessionId);
  if (!('supabase' in gate)) {
    return gate;
  }
  const { supabase, user } = gate;

  const result = await updateCompletedSessionTimesForUser(
    supabase,
    user.id,
    sessionId,
    times
  );
  if ('error' in result) {
    return result;
  }

  revalidatePath('/history');
  revalidatePath(`/history/${sessionId}`);
  revalidatePath('/stats');
  return {};
}

export async function deleteWorkoutSession(
  sessionId: string
): Promise<{ error?: string }> {
  const gate = await requireAuthForSessionId(sessionId);
  if (!('supabase' in gate)) {
    return { error: gate.error };
  }
  const { supabase, user } = gate;

  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/history');
  return {};
}

export async function deleteCompletedWorkoutHistory() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user } = auth;

  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('user_id', user.id)
    .not('ended_at', 'is', null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/history');
  revalidatePath('/stats');
  return {};
}

export async function deleteAllUserData() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user } = auth;

  const { error: sErr } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('user_id', user.id);

  if (sErr) {
    return { error: sErr.message };
  }

  const { error: wErr } = await supabase
    .from('workouts')
    .delete()
    .eq('user_id', user.id);

  if (wErr) {
    return { error: wErr.message };
  }

  const { error: eErr } = await supabase
    .from('exercises')
    .delete()
    .eq('user_id', user.id);

  if (eErr) {
    return { error: eErr.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/history');
  revalidatePath('/stats');
  revalidatePath('/dashboard/active');
  revalidatePath('/workouts');
  revalidatePath('/exercises');
  return {};
}
