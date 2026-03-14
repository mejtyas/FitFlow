"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createWorkoutSession } from "@/lib/create-workout-session";

export async function startWorkout(workoutId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const result = await createWorkoutSession(supabase, user.id, workoutId);

  if ("error" in result) return { error: result.error };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/active");
  return { sessionId: result.sessionId };
}

export async function endWorkout(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // End all active sessions for this user to prevent "zombie" sessions
  const { error } = await supabase
    .from("workout_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("ended_at", null);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/dashboard/active");
  return {};
}

export async function addSetToSessionExercise(sessionExerciseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: maxSet } = await supabase
    .from("session_sets")
    .select("set_index")
    .eq("session_exercise_id", sessionExerciseId)
    .order("set_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIndex = (maxSet?.set_index ?? -1) + 1;
  const { data: newSet, error } = await supabase.from("session_sets").insert({
    session_exercise_id: sessionExerciseId,
    set_index: nextIndex,
    kg: null,
    reps: null,
  }).select("id, set_index, kg, reps").single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/active");
  return { set: newSet };
}

export async function updateSet(
  setId: string,
  updates: { kg?: number | null; reps?: number | null }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const payload: { kg?: number | null; reps?: number | null } = {};
  if (updates.kg !== undefined) payload.kg = updates.kg;
  if (updates.reps !== undefined) payload.reps = updates.reps;

  const { error } = await supabase
    .from("session_sets")
    .update(payload)
    .eq("id", setId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteSet(setId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("session_sets")
    .delete()
    .eq("id", setId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/active");
  return {};
}

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
  orderIndex: number,
  shiftsById?: { id: string; order_index: number }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const shiftIds = shiftsById?.map((s) => s.id) ?? [];
  const shiftOrders = shiftsById?.map((s) => s.order_index) ?? [];

  const { data, error } = await supabase.rpc("add_exercise_to_session", {
    p_session_id: sessionId,
    p_exercise_id: exerciseId,
    p_order_index: orderIndex,
    p_shift_ids: shiftIds,
    p_shift_orders: shiftOrders,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/active");
  return {
    sessionExercise: { id: data.session_exercise_id, order_index: data.order_index },
    initialSet: { id: data.set_id, set_index: 0, kg: null, reps: null },
  };
}

export async function deleteWorkoutSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) return { error: "Session not found or access denied" };

  const { data: sessionExercises } = await supabase
    .from("session_exercises")
    .select("id")
    .eq("workout_session_id", sessionId);

  const seIds = (sessionExercises ?? []).map((se) => se.id);
  if (seIds.length > 0) {
    await supabase.from("session_sets").delete().in("session_exercise_id", seIds);
  }
  await supabase.from("session_exercises").delete().eq("workout_session_id", sessionId);
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/history");
  return {};
}

export async function deleteCompletedWorkoutHistory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id)
    .not("ended_at", "is", null);

  const sessionIds = (sessions ?? []).map((s) => s.id);

  if (sessionIds.length > 0) {
    const { data: sessionExercises } = await supabase
      .from("session_exercises")
      .select("id")
      .in("workout_session_id", sessionIds);

    const seIds = (sessionExercises ?? []).map((se) => se.id);
    if (seIds.length > 0) {
      await supabase.from("session_sets").delete().in("session_exercise_id", seIds);
    }
    await supabase.from("session_exercises").delete().in("workout_session_id", sessionIds);
    await supabase.from("workout_sessions").delete().in("id", sessionIds);
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/stats");
  return {};
}

export async function deleteAllUserData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // 1. Get all session IDs for this user
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id);

  const sessionIds = (sessions ?? []).map((s) => s.id);

  if (sessionIds.length > 0) {
    // 2. Get all session exercise IDs for these sessions
    const { data: sessionExercises } = await supabase
      .from("session_exercises")
      .select("id")
      .in("workout_session_id", sessionIds);

    const seIds = (sessionExercises ?? []).map((se) => se.id);
    if (seIds.length > 0) {
      // 3. Delete sets first
      await supabase.from("session_sets").delete().in("session_exercise_id", seIds);
    }
    // 4. Delete session exercises
    await supabase.from("session_exercises").delete().in("workout_session_id", sessionIds);
  }
  // 5. Delete sessions
  await supabase.from("workout_sessions").delete().eq("user_id", user.id);

  // 6. Delete workout_exercises (linked to workouts)
  const { data: userWorkouts } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", user.id);
  
  const workoutIds = (userWorkouts ?? []).map(w => w.id);
  if (workoutIds.length > 0) {
    await supabase.from("workout_exercises").delete().in("workout_id", workoutIds);
    // 7. Delete workouts
    await supabase.from("workouts").delete().eq("user_id", user.id);
  }

  // 8. Delete exercises (these might be used in other users' workouts if public, 
  // but based on the schema and actions they have user_id, so they are user-specific)
  await supabase.from("exercises").delete().eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/stats");
  revalidatePath("/dashboard/active");
  revalidatePath("/workouts");
  revalidatePath("/exercises");
  return {};
}
