import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateWorkoutSessionResult =
  | { sessionId: string }
  | { error: "active_session_exists"; existingSessionId: string }
  | { error: string };

function sameWorkoutId(
  a: string | null | undefined,
  b: string | null
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a === b;
}

export async function createWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string | null
): Promise<CreateWorkoutSessionResult> {
  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id, workout_id")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (sameWorkoutId(existing.workout_id, workoutId)) {
      return { sessionId: existing.id };
    }
    return {
      error: "active_session_exists",
      existingSessionId: existing.id,
    };
  }

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      workout_id: workoutId || null,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessionError) return { error: sessionError.message };
  if (!session) return { error: "Failed to create session" };

  if (workoutId) {
    const { data: workoutExercises } = await supabase
      .from("workout_exercises")
      .select("exercise_id, order_index, default_sets")
      .eq("workout_id", workoutId)
      .order("order_index");

    if (workoutExercises?.length) {
      const seRows = workoutExercises.map((we, i) => ({
        workout_session_id: session.id,
        exercise_id: we.exercise_id,
        order_index: i,
      }));

      const { data: insertedSEs, error: seError } = await supabase
        .from("session_exercises")
        .insert(seRows)
        .select("id, order_index");

      if (seError) return { error: seError.message };

      const sortedSEs = (insertedSEs ?? []).sort(
        (a, b) => a.order_index - b.order_index
      );

      const allSetRows = sortedSEs.flatMap((se, idx) => {
        const defaultSets = workoutExercises[idx].default_sets ?? 2;
        return Array.from({ length: defaultSets }, (_, j) => ({
          session_exercise_id: se.id,
          set_index: j,
          kg: null,
          reps: null,
        }));
      });

      if (allSetRows.length > 0) {
        const { error: setsError } = await supabase
          .from("session_sets")
          .insert(allSetRows);
        if (setsError) return { error: setsError.message };
      }
    }
  }

  return { sessionId: session.id };
}
