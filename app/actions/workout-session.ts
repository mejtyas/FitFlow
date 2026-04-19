"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createWorkoutSession } from "@/lib/create-workout-session";
import { updateCompletedSessionTimesForUser } from "@/lib/workout-session/update-completed-session-times";
import {
  assertActiveSessionOwnedByUser,
  updateSessionSetKgRepsForUser,
  verifySessionExerciseBelongsToSession,
  verifySetBelongsToSession,
} from "@/lib/workout-session/persist-session-sets";
import { isValidUuid } from "@/lib/validation";

export async function startWorkout(workoutId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (workoutId != null && !isValidUuid(workoutId)) {
    return { error: "Invalid workout" };
  }

  const result = await createWorkoutSession(supabase, user.id, workoutId);

  if ("error" in result) {
    if (
      result.error === "active_session_exists" &&
      "existingSessionId" in result
    ) {
      return {
        error: result.error,
        existingSessionId: result.existingSessionId,
      };
    }
    return { error: result.error };
  }

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
  if (!isValidUuid(sessionId)) return { error: "Invalid session" };

  const endedAt = new Date().toISOString();

  const { error: primaryErr } = await supabase
    .from("workout_sessions")
    .update({ ended_at: endedAt })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .is("ended_at", null);

  if (primaryErr) return { error: primaryErr.message };

  const { error: zombieErr } = await supabase
    .from("workout_sessions")
    .update({ ended_at: endedAt })
    .eq("user_id", user.id)
    .is("ended_at", null);

  if (zombieErr) return { error: zombieErr.message };
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/dashboard/active");
  return {};
}

export async function addSetToSessionExercise(
  workoutSessionId: string,
  sessionExerciseId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!isValidUuid(workoutSessionId) || !isValidUuid(sessionExerciseId)) {
    return { error: "Invalid id" };
  }

  const gate = await assertActiveSessionOwnedByUser(
    supabase,
    user.id,
    workoutSessionId
  );
  if (gate.error) return gate;

  const seOk = await verifySessionExerciseBelongsToSession(
    supabase,
    sessionExerciseId,
    workoutSessionId
  );
  if (!seOk) return { error: "Session exercise not found" };

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
  workoutSessionId: string,
  setId: string,
  updates: { kg?: number | null; reps?: number | null }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!isValidUuid(workoutSessionId) || !isValidUuid(setId)) {
    return { error: "Invalid id" };
  }

  const result = await updateSessionSetKgRepsForUser(
    supabase,
    user.id,
    workoutSessionId,
    setId,
    updates
  );
  if (result.error) return result;

  revalidatePath("/dashboard/active");
  return {};
}

export async function deleteSet(workoutSessionId: string, setId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!isValidUuid(workoutSessionId) || !isValidUuid(setId)) {
    return { error: "Invalid id" };
  }

  const gate = await assertActiveSessionOwnedByUser(
    supabase,
    user.id,
    workoutSessionId
  );
  if (gate.error) return gate;

  const setOk = await verifySetBelongsToSession(
    supabase,
    setId,
    workoutSessionId
  );
  if (!setOk) return { error: "Set not found" };

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
  if (
    !isValidUuid(sessionId) ||
    !isValidUuid(exerciseId) ||
    shiftsById?.some((s) => !isValidUuid(s.id))
  ) {
    return { error: "Invalid id" };
  }

  const sessionGate = await assertActiveSessionOwnedByUser(
    supabase,
    user.id,
    sessionId
  );
  if (sessionGate.error) return sessionGate;

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

  if (!data || typeof data !== "object") {
    return { error: "Invalid server response" };
  }

  const payload = data as {
    session_exercise_id: string;
    order_index: number;
    set_id: string;
  };

  revalidatePath("/dashboard/active");
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
    },
  };
}

export async function removeExerciseFromSession(
  workoutSessionId: string,
  sessionExerciseId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!isValidUuid(workoutSessionId) || !isValidUuid(sessionExerciseId)) {
    return { error: "Invalid id" };
  }

  const gate = await assertActiveSessionOwnedByUser(
    supabase,
    user.id,
    workoutSessionId
  );
  if (gate.error) return gate;

  const seOk = await verifySessionExerciseBelongsToSession(
    supabase,
    sessionExerciseId,
    workoutSessionId
  );
  if (!seOk) return { error: "Session exercise not found" };

  const { error: delErr } = await supabase
    .from("session_exercises")
    .delete()
    .eq("id", sessionExerciseId)
    .eq("workout_session_id", workoutSessionId);

  if (delErr) return { error: delErr.message };

  const { data: remaining, error: listErr } = await supabase
    .from("session_exercises")
    .select("id")
    .eq("workout_session_id", workoutSessionId)
    .order("order_index");

  if (listErr) return { error: listErr.message };

  for (let i = 0; i < (remaining ?? []).length; i++) {
    const row = remaining![i]!;
    const { error: upErr } = await supabase
      .from("session_exercises")
      .update({ order_index: i })
      .eq("id", row.id);
    if (upErr) return { error: upErr.message };
  }

  revalidatePath("/dashboard/active");
  return {};
}

export async function updateCompletedSessionTimes(
  sessionId: string,
  times: { startedAt: string; endedAt: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!isValidUuid(sessionId)) return { error: "Invalid session" };

  const result = await updateCompletedSessionTimesForUser(
    supabase,
    user.id,
    sessionId,
    times
  );
  if ("error" in result) return result;

  revalidatePath("/history");
  revalidatePath(`/history/${sessionId}`);
  revalidatePath("/stats");
  return {};
}

export async function deleteWorkoutSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!isValidUuid(sessionId)) return { error: "Invalid session" };

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

  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("user_id", user.id)
    .not("ended_at", "is", null);

  if (error) return { error: error.message };

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

  const { error: sErr } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("user_id", user.id);

  if (sErr) return { error: sErr.message };

  const { error: wErr } = await supabase
    .from("workouts")
    .delete()
    .eq("user_id", user.id);

  if (wErr) return { error: wErr.message };

  const { error: eErr } = await supabase
    .from("exercises")
    .delete()
    .eq("user_id", user.id);

  if (eErr) return { error: eErr.message };

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/stats");
  revalidatePath("/dashboard/active");
  revalidatePath("/workouts");
  revalidatePath("/exercises");
  return {};
}
