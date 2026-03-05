import type { SupabaseClient } from "@supabase/supabase-js";

export async function createWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string | null
): Promise<{ sessionId: string } | { error: string }> {
  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return { sessionId: existing.id };

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
      for (let i = 0; i < workoutExercises.length; i++) {
        const we = workoutExercises[i];
        const { data: se, error: seError } = await supabase
          .from("session_exercises")
          .insert({
            workout_session_id: session.id,
            exercise_id: we.exercise_id,
            order_index: i,
          })
          .select("id")
          .single();

        if (seError) return { error: seError.message };
        if (se) {
          const setRows = Array.from(
            { length: we.default_sets ?? 2 },
            (_, j) => ({
              session_exercise_id: se.id,
              set_index: j,
              kg: null,
              reps: null,
            })
          );
          const { error: setsError } = await supabase
            .from("session_sets")
            .insert(setRows);
          if (setsError) return { error: setsError.message };
        }
      }
    }
  }

  return { sessionId: session.id };
}
