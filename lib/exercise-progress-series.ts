import { estimatedOneRmEpley } from '@/lib/estimated-one-rm';

export type SessionSetRow = {
  id: string;
  set_index: number;
  kg: number | null;
  reps: number | null;
};

export type ExerciseHistoryRow = {
  id: string;
  workout_session_id: string;
  logged_order?: number | null;
  first_logged_at?: string | null;
  workout_sessions: {
    id: string;
    started_at: string;
    ended_at: string | null;
    workouts: { name: string } | { name: string }[] | null;
  };
  session_sets: SessionSetRow[] | null;
};

export type ExerciseProgressPoint = {
  /** ISO timestamp for sorting / axis */
  startedAt: string;
  /** Short label for X axis */
  dateLabel: string;
  workoutName: string;
  sessionId: string;
  maxKg: number;
  volume: number;
  /** Best session est. 1RM (Epley) across sets with valid kg × reps */
  estimatedOneRm: number;
  /** Set that yielded {@link estimatedOneRm} */
  strengthSetKg: number;
  strengthSetReps: number;
  /** Heaviest set by kg, for tooltip */
  bestSetKg: number;
  bestSetReps: number;
};

function workoutNameFromJoin(
  workouts: ExerciseHistoryRow['workout_sessions']['workouts']
): string {
  if (!workouts) {return 'Workout';}
  const w = Array.isArray(workouts) ? workouts[0] : workouts;
  return w?.name?.trim() || 'Workout';
}

function parseNum(v: number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Maps session_exercises history (newest-first from query) to chart points oldest-first.
 */
export function buildExerciseProgressSeries(
  history: ExerciseHistoryRow[] | null | undefined
): ExerciseProgressPoint[] {
  if (!history?.length) {return [];}

  const rows = history.map((h) => {
    const session = h.workout_sessions;
    const sets = [...(h.session_sets ?? [])].sort((a, b) => a.set_index - b.set_index);
    const kgList = sets.map((s) => parseNum(s.kg));
    const maxKg = kgList.length ? Math.max(...kgList) : 0;
    const volume = sets.reduce(
      (sum, s) => sum + parseNum(s.kg) * parseNum(s.reps),
      0
    );
    let bestSetKg = 0;
    let bestSetReps = 0;
    let estimatedOneRm = 0;
    let strengthSetKg = 0;
    let strengthSetReps = 0;
    for (const s of sets) {
      const kg = parseNum(s.kg);
      const reps = parseNum(s.reps);
      if (kg > bestSetKg || (kg === bestSetKg && reps > bestSetReps)) {
        bestSetKg = kg;
        bestSetReps = reps;
      }
      const e1 = estimatedOneRmEpley(kg, reps);
      if (e1 !== null && e1 !== undefined && e1 > estimatedOneRm) {
        estimatedOneRm = e1;
        strengthSetKg = kg;
        strengthSetReps = reps;
      }
    }
    const started = new Date(session.started_at);
    const y = started.getFullYear();
    const nowY = new Date().getFullYear();
    const dateLabel = started.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(y !== nowY ? { year: 'numeric' as const } : {}),
    });
    return {
      startedAt: session.started_at,
      dateLabel,
      workoutName: workoutNameFromJoin(session.workouts),
      sessionId: session.id,
      maxKg,
      volume,
      estimatedOneRm,
      strengthSetKg,
      strengthSetReps,
      bestSetKg,
      bestSetReps,
    };
  });

  rows.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  return rows;
}
