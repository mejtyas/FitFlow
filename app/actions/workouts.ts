'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  parseWorkoutExercisesFromForm,
  rpcReplaceWorkoutExercises,
} from '@/lib/actions/replace-workout-exercises-from-json';
import { requireUserAndWorkoutFormName } from '@/lib/actions/require-user-workout-form';

export async function createWorkout(
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  const gate = await requireUserAndWorkoutFormName(formData);
  if ('error' in gate) {
    return gate;
  }
  const { supabase, user, name } = gate;

  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({ user_id: user.id, name })
    .select('id')
    .single();

  if (workoutError) {
    return { error: workoutError.message };
  }

  const exercisesJson = formData.get('exercises') as string;
  const parsed = parseWorkoutExercisesFromForm(exercisesJson);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  if (parsed.exercises.length > 0) {
    const rpc = await rpcReplaceWorkoutExercises(
      supabase,
      workout.id,
      parsed.exercises
    );
    if (rpc.error) {
      return { error: rpc.error };
    }
  }

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  return { id: workout.id };
}

export async function updateWorkout(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const gate = await requireUserAndWorkoutFormName(formData);
  if ('error' in gate) {
    return gate;
  }
  const { supabase, user, name } = gate;

  const { error: updateError } = await supabase
    .from('workouts')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  const exercisesJson = formData.get('exercises') as string;
  if (exercisesJson !== undefined && exercisesJson !== null) {
    const parsed = parseWorkoutExercisesFromForm(exercisesJson || '[]');
    if (!parsed.ok) {
      return { error: parsed.error };
    }

    const rpc = await rpcReplaceWorkoutExercises(supabase, id, parsed.exercises);
    if (rpc.error) {
      return { error: rpc.error };
    }
  }

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  return {};
}

export async function deleteWorkout(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id?.trim()) {
    return { error: 'Missing workout id' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  return {};
}
