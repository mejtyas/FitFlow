'use server';

import { revalidatePath } from 'next/cache';
import { activeSessionGateOrError } from '@/lib/workout-session/active-session-gate';
import { verifySetBelongsToSession } from '@/lib/workout-session/persist-session-sets';
import { requireSessionExerciseMutationContext } from '@/lib/workout-session/require-session-exercise-mutation-context';
import { requireSessionMutationIds } from '@/lib/workout-session/require-session-mutation-ids';

export async function addSetToSessionExercise(
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

  const { data: maxSet } = await supabase
    .from('session_sets')
    .select('set_index')
    .eq('session_exercise_id', sessionExerciseId)
    .order('set_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIndex = (maxSet?.set_index ?? -1) + 1;
  const { data: newSet, error } = await supabase
    .from('session_sets')
    .insert({
      session_exercise_id: sessionExerciseId,
      set_index: nextIndex,
      kg: null,
      reps: null,
    })
    .select('id, set_index, kg, reps, completed')
    .single();

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/dashboard/active');
  return { set: newSet };
}

export async function deleteSet(workoutSessionId: string, setId: string) {
  const ctx = await requireSessionMutationIds(workoutSessionId, setId);
  if (!('supabase' in ctx)) {
    return ctx;
  }
  const { supabase, user } = ctx;

  const gateErr = await activeSessionGateOrError(
    supabase,
    user.id,
    workoutSessionId
  );
  if (gateErr) {
    return gateErr;
  }

  const setOk = await verifySetBelongsToSession(
    supabase,
    setId,
    workoutSessionId
  );
  if (!setOk.ok) {
    return { error: 'Set not found' };
  }

  const { error } = await supabase
    .from('session_sets')
    .delete()
    .eq('id', setId);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/dashboard/active');
  return {};
}
