import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActiveWorkoutView } from "./active-workout-view";

export default async function ActiveWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let session: { id: string; started_at: string; workout_id: string | null; workouts: unknown } | null = null;

  if (params.session) {
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, started_at, workout_id, workouts(name)")
      .eq("id", params.session)
      .eq("user_id", user.id)
      .is("ended_at", null)
      .maybeSingle();
    session = data;
  }

  if (!session) {
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, started_at, workout_id, workouts(name)")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    session = data;
  }

  if (!session) {
    redirect("/dashboard");
  }

  const { data: sessionExercises } = await supabase
    .from("session_exercises")
    .select(
      "id, order_index, exercise_id, exercises(name), session_sets(id, set_index, kg, reps)"
    )
    .eq("workout_session_id", session.id)
    .order("order_index");

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  // Fetch previous performance for each exercise
  const sessionExercisesWithPrev = await Promise.all(
    (sessionExercises ?? []).map(async (se) => {
      const { data: prevSE } = await supabase
        .from("session_exercises")
        .select(`
          id,
          workout_sessions!inner (
            id,
            ended_at
          ),
          session_sets (
            id,
            set_index,
            kg,
            reps
          )
        `)
        .eq("exercise_id", se.exercise_id)
        .eq("workout_sessions.user_id", user.id)
        .neq("workout_session_id", session.id)
        .not("workout_sessions.ended_at", "is", null)
        .order("workout_sessions(ended_at)", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevSets = prevSE?.session_sets 
        ? [...prevSE.session_sets].sort((a: any, b: any) => a.set_index - b.set_index).slice(0, 2)
        : [];

      const ex = se.exercises as { name: string } | { name: string }[] | null;
      const name = Array.isArray(ex) ? ex[0]?.name : ex?.name;
      const sets = (se.session_sets as { id: string; set_index: number; kg: number | null; reps: number | null }[] | null) ?? [];

      return {
        id: se.id,
        order_index: se.order_index,
        exercise_id: se.exercise_id,
        exercise_name: name ?? "?",
        sets: [...sets].sort((a, b) => a.set_index - b.set_index),
        previous_sets: prevSets.map((ps: any) => ({ kg: ps.kg, reps: ps.reps })),
      };
    })
  );

  const w = session.workouts as { name: string } | { name: string }[] | null;
  const workoutName =
    (Array.isArray(w) ? w[0]?.name : w?.name) ?? "Freestyle";

  return (
    <ActiveWorkoutView
      sessionId={session.id}
      startedAt={session.started_at}
      workoutName={workoutName}
      sessionExercises={sessionExercisesWithPrev}
      availableExercises={exercises ?? []}
    />
  );
}
