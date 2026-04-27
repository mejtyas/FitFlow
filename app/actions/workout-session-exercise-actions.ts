'use server';

import { revalidatePath } from 'next/cache';
import { assertActiveSessionOwnedByUser } from '@/lib/workout-session/persist-session-sets';
import { requireSessionExerciseMutationContext } from '@/lib/workout-session/require-session-exercise-mutation-context';
import { requireSessionMutationIds } from '@/lib/workout-session/require-session-mutation-ids';
import { isValidUuid } from '@/lib/validation';

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
  orderIndex: number,
  shiftsById?: { id: string; order_index: number }[]
) {
  const ctx = await requireSessionMutationIds(sessionId, exerciseId);
  if (!('supabase' in ctx)) {
    return ctx;
  }
  const { supabase, user } = ctx;
  if (shiftsById?.some((s) => !isValidUuid(s.id))) {
    return { error: 'Invalid id' };
  }

  const sessionGate = await assertActiveSessionOwnedByUser(
    supabase,
    user.id,
    sessionId
  );
  if (sessionGate.error) {
    return sessionGate;
  }

  const shiftIds = shiftsById?.map((s) => s.id) ?? [];
  const shiftOrders = shiftsById?.map((s) => s.order_index) ?? [];

  const { data, error } = await supabase.rpc('add_exercise_to_session', {
    p_session_id: sessionId,
    p_exercise_id: exerciseId,
    p_order_index: orderIndex,
    p_shift_ids: shiftIds,
    p_shift_orders: shiftOrders,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data || typeof data !== 'object') {
    return { error: 'Invalid server response' };
  }

  const payload = data as {
    session_exercise_id: string;
    order_index: number;
    set_id: string;
  };

  revalidatePath('/dashboard/active');
  return {
    sessionExercise: {
      id: payload.session_exercise_id,
      order_index: payload.order_index,
    },
    initialSet: {
      id: payload.set_id,
      set_index: 0,
      kg: null,
      reps: null,
      completed: false,
    },
  };
}

export async function removeExerciseFromSession(
  workoutSessionId: string,
  sessionExerciseId: string
) {
  const ctx = await requireSessionExerciseMutationContext(
    workoutSessionId,
    sessionExerciseId
  );
  if (!('supabase' in ctx)) {
    return ctx;
  }
  const { supabase } = ctx;

  const { error: delErr } = await supabase
    .from('session_exercises')
    .delete()
    .eq('id', sessionExerciseId)
    .eq('workout_session_id', workoutSessionId);

  if (delErr) {
    return { error: delErr.message };
  }

  const { data: remaining, error: listErr } = await supabase
    .from('session_exercises')
    .select('id')
    .eq('workout_session_id', workoutSessionId)
    .order('order_index');

  if (listErr) {
    return { error: listErr.message };
  }

  const reorderResults = await Promise.all(
    (remaining ?? []).map((row, i) =>
      supabase
        .from('session_exercises')
        .update({ order_index: i })
        .eq('id', row.id)
    )
  );
  const firstErr = reorderResults.find((r) => r.error)?.error;
  if (firstErr) {
    return { error: firstErr.message };
  }

  revalidatePath('/dashboard/active');
  return {};
}
