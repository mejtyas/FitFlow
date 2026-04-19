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
  const HISTORY_SESSION_LIMIT = 6;

  const { data: prevPerformances } = exerciseIds.length > 0
    ? await supabase
        .from("session_exercises")
        .select(`
          exercise_id,
          workout_sessions!inner (
            id,
            started_at,
            ended_at,
            workouts ( name )
          ),
          session_sets (id, set_index, kg, reps)
        `)
        .in("exercise_id", exerciseIds)
        .eq("workout_sessions.user_id", user.id)
        .neq("workout_session_id", session.id)
        .not("workout_sessions.ended_at", "is", null)
        .order("workout_sessions(ended_at)", { ascending: false })
    : { data: [] };

  type WorkoutSessionsRow = {
    id: string;
    started_at: string;
    ended_at: string;
    workouts: { name: string | null } | { name: string | null }[] | null;
  };

  const pastByExercise = new Map<
    string,
    {
      sessionId: string;
      startedAt: string;
      endedAt: string;
      workoutName: string;
      sets: { kg: number | null; reps: number | null }[];
    }[]
  >();

  for (const perf of prevPerformances ?? []) {
    const exId = perf.exercise_id as string;
    const list = pastByExercise.get(exId) ?? [];
    if (list.length >= HISTORY_SESSION_LIMIT) continue;

    const ws = perf.workout_sessions as WorkoutSessionsRow | WorkoutSessionsRow[] | null;
    const sessionRow = Array.isArray(ws) ? ws[0] : ws;
    if (!sessionRow) continue;

    const w = sessionRow.workouts;
    const workoutName =
      (Array.isArray(w) ? w[0]?.name : w?.name)?.trim() || "Workout";

    const sets = (
      (perf.session_sets as {
        id: string;
        set_index: number;
        kg: number | null;
        reps: number | null;
      }[]) ?? []
    )
      .sort((a, b) => a.set_index - b.set_index)
      .map((s) => ({ kg: s.kg, reps: s.reps }));

    list.push({
      sessionId: sessionRow.id,
      startedAt: sessionRow.started_at,
      endedAt: sessionRow.ended_at,
      workoutName,
      sets,
    });
    pastByExercise.set(exId, list);
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
      past_sessions: pastByExercise.get(se.exercise_id) ?? [],
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
