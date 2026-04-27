import type { RestTimerClientState } from '@/lib/workout-session/session-rest-timer';
import type { WarmupSettings } from '@/lib/warmup-settings';

export type SetRow = {
  id: string;
  set_index: number;
  kg: number | null;
  reps: number | null;
  completed: boolean;
};

export type PastSessionPerformance = {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  workoutName: string;
  sets: { kg: number | null; reps: number | null }[];
};

export type SessionExercise = {
  id: string;
  order_index: number;
  exercise_id: string;
  exercise_name: string;
  exercise_description: string | null;
  sets: SetRow[];
  past_sessions: PastSessionPerformance[];
  warmup_settings: WarmupSettings;
};

export type ExerciseOption = {
  id: string;
  name: string;
  description: string | null;
  warmup_settings: WarmupSettings;
};

export type ActiveWorkoutViewProps = {
  sessionId: string;
  startedAt: string;
  workoutName: string;
  sessionExercises: SessionExercise[];
  availableExercises: ExerciseOption[];
  initialRest: RestTimerClientState;
};
