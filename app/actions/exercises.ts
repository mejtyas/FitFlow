'use server';

import { revalidatePath } from 'next/cache';
import type { Json } from '@/lib/supabase/database.types';
import { requireAuthExerciseId } from '@/lib/actions/require-auth-exercise-id';
import { parseExerciseFormNameDescription } from '@/lib/exercises/parse-exercise-form-fields';
import {
  parseWarmupSettings,
  warmupSettingsToJson,
  type WarmupSettings,
} from '@/lib/warmup-settings';
import { requireAuthUser } from '@/lib/supabase/require-auth-user';
import { sanitizeDescription } from '@/lib/validation';

export async function createExercise(
  formData: FormData
): Promise<{ error?: string }> {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return { error: auth.error };
  }
  const { supabase, user } = auth;

  const fields = parseExerciseFormNameDescription(formData);
  if (!fields.ok) {
    return { error: fields.error };
  }

  const { error } = await supabase.from('exercises').insert({
    user_id: user.id,
    name: fields.name,
    description: fields.description,
  });

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/exercises');
  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  return {};
}

export async function updateExercise(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const gate = await requireAuthExerciseId(id);
  if (!('supabase' in gate)) {
    return gate;
  }
  const { supabase, user } = gate;

  const fields = parseExerciseFormNameDescription(formData);
  if (!fields.ok) {
    return { error: fields.error };
  }

  const { error } = await supabase
    .from('exercises')
    .update({ name: fields.name, description: fields.description })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/exercises');
  revalidatePath('/workouts');
  return {};
}

export async function updateExerciseWarmupSettings(
  id: string,
  settings: WarmupSettings
): Promise<{ error?: string }> {
  const gate = await requireAuthExerciseId(id);
  if (!('supabase' in gate)) {
    return gate;
  }
  const { supabase, user } = gate;

  const normalized = parseWarmupSettings(warmupSettingsToJson(settings) as Json);
  const json = warmupSettingsToJson(normalized);

  const { error } = await supabase
    .from('exercises')
    .update({ warmup_settings: json })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/exercises');
  revalidatePath(`/exercises/${id}`);
  revalidatePath('/dashboard/active');
  return {};
}

export async function updateExerciseDescription(
  id: string,
  description: string
): Promise<{ error?: string }> {
  const gate = await requireAuthExerciseId(id);
  if (!('supabase' in gate)) {
    return gate;
  }
  const { supabase, user } = gate;

  const desc = sanitizeDescription(description);

  const { error } = await supabase
    .from('exercises')
    .update({ description: desc })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/exercises');
  revalidatePath('/dashboard');
  return {};
}

export async function deleteExercise(id: string): Promise<{ error?: string }> {
  const gate = await requireAuthExerciseId(id);
  if (!('supabase' in gate)) {
    return gate;
  }
  const { supabase, user } = gate;

  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/exercises');
  revalidatePath('/workouts');
  return {};
}
