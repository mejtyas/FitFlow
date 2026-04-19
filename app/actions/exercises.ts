"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isValidUuid,
  sanitizeDescription,
  sanitizeExerciseName,
} from "@/lib/validation";

export async function createExercise(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = sanitizeExerciseName(formData.get("name") as string);
  if (!name) return { error: "Name is required" };
  const description = sanitizeDescription(
    (formData.get("description") as string) ?? null
  );

  const { error } = await supabase.from("exercises").insert({
    user_id: user.id,
    name,
    description,
  });

  if (error) return { error: error.message };
  revalidatePath("/exercises");
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  return {};
}

export async function updateExercise(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!isValidUuid(id)) return { error: "Invalid exercise" };

  const name = sanitizeExerciseName(formData.get("name") as string);
  if (!name) return { error: "Name is required" };
  const description = sanitizeDescription(
    (formData.get("description") as string) ?? null
  );

  const { error } = await supabase
    .from("exercises")
    .update({ name, description })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/exercises");
  revalidatePath("/workouts");
  return {};
}

export async function updateExerciseDescription(id: string, description: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!isValidUuid(id)) return { error: "Invalid exercise" };

  const desc = sanitizeDescription(description);

  const { error } = await supabase
    .from("exercises")
    .update({ description: desc })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/exercises");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteExercise(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!isValidUuid(id)) return { error: "Invalid exercise" };

  const { error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/exercises");
  revalidatePath("/workouts");
  return {};
}
