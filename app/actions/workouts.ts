"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createWorkout(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Name is required" };

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({ user_id: user.id, name: name.trim() })
    .select("id")
    .single();

  if (workoutError) return { error: workoutError.message };

  const exercisesJson = formData.get("exercises") as string;
  if (exercisesJson) {
    const exercises: { exercise_id: string; default_sets: number }[] =
      JSON.parse(exercisesJson);
    if (exercises.length > 0) {
      const rows = exercises.map((e, i) => ({
        workout_id: workout.id,
        exercise_id: e.exercise_id,
        order_index: i,
        default_sets: e.default_sets ?? 2,
      }));
      const { error: exError } = await supabase
        .from("workout_exercises")
        .insert(rows);
      if (exError) return { error: exError.message };
    }
  }

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  return { id: workout.id };
}

export async function updateWorkout(
  id: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Name is required" };

  const { error: updateError } = await supabase
    .from("workouts")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError.message };

  const exercisesJson = formData.get("exercises") as string;
  if (exercisesJson !== undefined && exercisesJson !== null) {
    await supabase.from("workout_exercises").delete().eq("workout_id", id);
    const exercises: { exercise_id: string; default_sets: number }[] =
      JSON.parse(exercisesJson || "[]");
    if (exercises.length > 0) {
      const rows = exercises.map((e, i) => ({
        workout_id: id,
        exercise_id: e.exercise_id,
        order_index: i,
        default_sets: e.default_sets ?? 2,
      }));
      const { error: exError } = await supabase
        .from("workout_exercises")
        .insert(rows);
      if (exError) return { error: exError.message };
    }
  }

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteWorkout(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return;
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
}
