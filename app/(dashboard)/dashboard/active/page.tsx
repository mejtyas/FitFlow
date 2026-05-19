import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hydrateRestTimerForSession } from '@/lib/workout-session/session-rest-timer';
import { parseWarmupSettings } from '@/lib/warmup-settings';
import { isLoggedSetReps } from '@/lib/validation';
import type { Json } from '@/lib/supabase/database.types';
import { ActiveWorkoutView } from './active-workout-view';

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
  if (!user) {redirect('/login');}

  const selectedSession = params.session
    ? (
        await supabase
          .from('workout_sessions')
          .select('id, started_at, workout_id, workouts(name)')
          .eq('id', params.session)
          .eq('user_id', user.id)
          .is('ended_at', null)
          .maybeSingle()
      ).data
    : null;

  const latestSession = selectedSession
    ? null
    : (
        await supabase
          .from('workout_sessions')
          .select('id, started_at, workout_id, workouts(name)')
          .eq('user_id', user.id)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;

  const session = selectedSession ?? latestSession;

  if (!session) {
    redirect('/dashboard');
  }

  // Run independent queries in parallel
  const [{ data: sessionExercises }, { data: exercises }] = await Promise.all([
    supabase
      .from('session_exercises')
      .select(
        'id, order_index, exercise_id, exercises(name, description), session_sets(id, set_index, kg, reps, completed)'
      )
      .eq('workout_session_id', session.id)
      .order('order_index'),
    supabase
      .from('exercises')
      .select('id, name, description, warmup_settings')
      .eq('user_id', user.id)
      .order('name'),
  ]);

  const warmupByExerciseId = new Map(
    (exercises ?? []).map((row) => [
      row.id,
      parseWarmupSettings(row.warmup_settings as Json | null | undefined),
    ])
  );

  // Fetch previous performance (depends on sessionExercises result)
  const exerciseIds = (sessionExercises ?? []).map(se => se.exercise_id);
  const HISTORY_SESSION_LIMIT = 6;

  const { data: prevPerformances } = exerciseIds.length > 0
    ? await supabase
        .from('session_exercises')
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
        .in('exercise_id', exerciseIds)
        .eq('workout_sessions.user_id', user.id)
        .neq('workout_session_id', session.id)
        .not('workout_sessions.ended_at', 'is', null)
        .order('workout_sessions(ended_at)', { ascending: false })
    : { data: [] };

  type WorkoutSessionsRow = {
    id: string;
    started_at: string;
    ended_at: string;
    workouts: { name: string | null } | { name: string | null }[] | null;
  };

  const pastByExercise = (prevPerformances ?? []).reduce(
    (
      acc,
      perf
    ) => {
      const exId = perf.exercise_id as string;
      const list = acc.get(exId) ?? [];
      if (list.length >= HISTORY_SESSION_LIMIT) {
        return acc;
      }

      const ws = perf.workout_sessions as
        | WorkoutSessionsRow
        | WorkoutSessionsRow[]
        | null;
      const sessionRow = Array.isArray(ws) ? ws[0] : ws;
      if (!sessionRow) {
        return acc;
      }

      const w = sessionRow.workouts;
      const workoutName =
        (Array.isArray(w) ? w[0]?.name : w?.name)?.trim() || 'Workout';

      const sets = (
        (perf.session_sets as {
          id: string;
          set_index: number;
          kg: number | null;
          reps: number | null;
        }[]) ?? []
      )
        .sort((a, b) => a.set_index - b.set_index)
        .filter((s) => isLoggedSetReps(s.reps))
        .map((s) => ({ kg: s.kg, reps: s.reps }));

      acc.set(exId, [
        ...list,
        {
          sessionId: sessionRow.id,
          startedAt: sessionRow.started_at,
          endedAt: sessionRow.ended_at,
          workoutName,
          sets,
        },
      ]);
      return acc;
    },
    new Map<
      string,
      {
        sessionId: string;
        startedAt: string;
        endedAt: string;
        workoutName: string;
        sets: { kg: number | null; reps: number | null }[];
      }[]
    >()
  );

  const sessionExercisesWithPrev = (sessionExercises ?? []).map((se) => {
    const ex = se.exercises as { name: string; description: string | null } | { name: string; description: string | null }[] | null;
    const name = Array.isArray(ex) ? ex[0]?.name : ex?.name;
    const description = Array.isArray(ex) ? ex[0]?.description : ex?.description;
    const sets =
      (se.session_sets as {
        id: string;
        set_index: number;
        kg: number | null;
        reps: number | null;
        completed: boolean | null;
      }[] | null) ?? [];

    return {
      id: se.id,
      order_index: se.order_index,
      exercise_id: se.exercise_id,
      exercise_name: name ?? '?',
      exercise_description: description ?? null,
      sets: [...sets]
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({
          ...s,
          completed: s.completed === true,
        })),
      past_sessions: pastByExercise.get(se.exercise_id) ?? [],
      warmup_settings: warmupByExerciseId.get(se.exercise_id) ?? parseWarmupSettings(null),
    };
  });

  const w = session.workouts as { name: string } | { name: string }[] | null;
  const workoutName =
    (Array.isArray(w) ? w[0]?.name : w?.name) ?? 'Unnamed Session';

  const initialRest = await hydrateRestTimerForSession(
    supabase,
    user.id,
    session.id
  );

  const exerciseOptions = (exercises ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    warmup_settings:
      warmupByExerciseId.get(e.id) ?? parseWarmupSettings(null),
  }));

  return (
    <ActiveWorkoutView
      sessionId={session.id}
      startedAt={session.started_at}
      workoutName={workoutName}
      sessionExercises={sessionExercisesWithPrev}
      availableExercises={exerciseOptions}
      initialRest={initialRest}
    />
  );
}
