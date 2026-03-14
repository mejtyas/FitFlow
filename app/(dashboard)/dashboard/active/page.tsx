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
    data: { session: authSession },
  } = await supabase.auth.getSession();
  const user = authSession?.user;
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

  // Run independent queries in parallel
  const [{ data: sessionExercises }, { data: exercises }] = await Promise.all([
    supabase
      .from("session_exercises")
      .select(
        "id, order_index, exercise_id, exercises(name, description), session_sets(id, set_index, kg, reps)"
      )
      .eq("workout_session_id", session.id)
      .order("order_index"),
    supabase
      .from("exercises")
      .select("id, name, description")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  // Fetch previous performance (depends on sessionExercises result)
  const exerciseIds = (sessionExercises ?? []).map(se => se.exercise_id);
  const { data: prevPerformances } = exerciseIds.length > 0
    ? await supabase
        .from("session_exercises")
        .select(`
          exercise_id,
          workout_sessions!inner (id, ended_at),
          session_sets (id, set_index, kg, reps)
        `)
        .in("exercise_id", exerciseIds)
        .eq("workout_sessions.user_id", user.id)
        .neq("workout_session_id", session.id)
        .not("workout_sessions.ended_at", "is", null)
        .order("workout_sessions(ended_at)", { ascending: false })
    : { data: [] };

  // Group by exercise_id, keep only the most recent (first) per exercise
  const prevByExercise = new Map<string, { kg: number | null; reps: number | null }[]>();
  for (const perf of prevPerformances ?? []) {
    if (!prevByExercise.has(perf.exercise_id)) {
      const sets = (perf.session_sets as { id: string; set_index: number; kg: number | null; reps: number | null }[] ?? [])
        .sort((a, b) => a.set_index - b.set_index)
        .slice(0, 2);
      prevByExercise.set(perf.exercise_id, sets.map(ps => ({ kg: ps.kg, reps: ps.reps })));
    }
  }

  const sessionExercisesWithPrev = (sessionExercises ?? []).map((se) => {
    const ex = se.exercises as { name: string; description: string | null } | { name: string; description: string | null }[] | null;
    const name = Array.isArray(ex) ? ex[0]?.name : ex?.name;
    const description = Array.isArray(ex) ? ex[0]?.description : ex?.description;
    const sets = (se.session_sets as { id: string; set_index: number; kg: number | null; reps: number | null }[] | null) ?? [];

    return {
      id: se.id,
      order_index: se.order_index,
      exercise_id: se.exercise_id,
      exercise_name: name ?? "?",
      exercise_description: description ?? null,
      sets: [...sets].sort((a, b) => a.set_index - b.set_index),
      previous_sets: prevByExercise.get(se.exercise_id) ?? [],
    };
  });

  const w = session.workouts as { name: string } | { name: string }[] | null;
  const workoutName =
    (Array.isArray(w) ? w[0]?.name : w?.name) ?? "Unnamed Session";

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
