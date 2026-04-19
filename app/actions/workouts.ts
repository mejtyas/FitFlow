"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  sanitizeWorkoutExerciseName,
} from "@/lib/validation";

function parseWorkoutExercisesJson(
  raw: string | null | undefined
):
  | { ok: true; exercises: { exercise_id: string; default_sets: number }[] }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, exercises: [] };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: "Invalid exercises data" };
    }
    const exercises = parsed.map((e) => {
      const row = e as { exercise_id?: string; default_sets?: number };
      return {
        exercise_id: row.exercise_id ?? "",
        default_sets: row.default_sets ?? 2,
      };
    });
    return { ok: true, exercises };
  } catch {
    return { ok: false, error: "Invalid exercises data" };
  }
}

export async function createWorkout(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = sanitizeWorkoutExerciseName(formData.get("name") as string);
  if (!name) return { error: "Name is required" };

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({ user_id: user.id, name })
    .select("id")
    .single();

  if (workoutError) return { error: workoutError.message };

  const exercisesJson = formData.get("exercises") as string;
  const parsed = parseWorkoutExercisesJson(exercisesJson);
  if (!parsed.ok) return { error: parsed.error };

  if (parsed.exercises.length > 0) {
    const payload: Json = parsed.exercises.map((e, i) => ({
      exercise_id: e.exercise_id,
      order_index: i,
      default_sets: e.default_sets ?? 2,
    }));

    const { error: rpcError } = await supabase.rpc("replace_workout_exercises", {
      p_workout_id: workout.id,
      p_exercises: payload,
    });

    if (rpcError) return { error: rpcError.message };
  }

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  return { id: workout.id };
}

export async function updateWorkout(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = sanitizeWorkoutExerciseName(formData.get("name") as string);
  if (!name) return { error: "Name is required" };

  const { error: updateError } = await supabase
    .from("workouts")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError.message };

  const exercisesJson = formData.get("exercises") as string;
  if (exercisesJson !== undefined && exercisesJson !== null) {
    const parsed = parseWorkoutExercisesJson(exercisesJson || "[]");
    if (!parsed.ok) return { error: parsed.error };

    const payload: Json = parsed.exercises.map((e, i) => ({
      exercise_id: e.exercise_id,
      order_index: i,
      default_sets: e.default_sets ?? 2,
    }));

    const { error: rpcError } = await supabase.rpc("replace_workout_exercises", {
      p_workout_id: id,
      p_exercises: payload,
    });

    if (rpcError) return { error: rpcError.message };
  }

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteWorkout(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id?.trim()) return { error: "Missing workout id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  return {};
}
