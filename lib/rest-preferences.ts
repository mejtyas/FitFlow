import { REST_DEFAULT_SECONDS } from '@/app/(dashboard)/dashboard/active/active-workout-constants';

const REST_PREFERENCES_LS_KEY = 'fitflow:preferences';

type RestPreferences = {
  defaultRestSeconds: number;
};

function clampRestSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) {
    return REST_DEFAULT_SECONDS;
  }
  return Math.min(600, Math.max(15, Math.round(seconds)));
}

export function getDefaultRestSeconds(): number {
  if (typeof window === 'undefined') {
    return REST_DEFAULT_SECONDS;
  }
  try {
    const raw = localStorage.getItem(REST_PREFERENCES_LS_KEY);
    if (!raw) {
      return REST_DEFAULT_SECONDS;
    }
    const parsed = JSON.parse(raw) as Partial<RestPreferences>;
    if (typeof parsed.defaultRestSeconds !== 'number') {
      return REST_DEFAULT_SECONDS;
    }
    return clampRestSeconds(parsed.defaultRestSeconds);
  } catch {
    return REST_DEFAULT_SECONDS;
  }
}

export function saveDefaultRestSeconds(seconds: number): void {
  const defaultRestSeconds = clampRestSeconds(seconds);
  try {
    localStorage.setItem(
      REST_PREFERENCES_LS_KEY,
      JSON.stringify({ defaultRestSeconds } satisfies RestPreferences)
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function resolveRestSeconds(
  exerciseId: string,
  restDurations: Record<string, number>
): number {
  const perExercise = restDurations[exerciseId];
  if (typeof perExercise === 'number' && Number.isFinite(perExercise)) {
    return clampRestSeconds(perExercise);
  }
  return getDefaultRestSeconds();
}
