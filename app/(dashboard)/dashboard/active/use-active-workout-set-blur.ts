'use client';

import {
  setHasLoggedRepsAndKg,
} from '@/app/(dashboard)/dashboard/active/active-workout-set-value';
import { writeMirrorPatch } from '@/app/(dashboard)/dashboard/active/active-workout-mirror';
import type { ActiveWorkoutBase } from '@/app/(dashboard)/dashboard/active/use-active-workout-base';
import { useCallback } from 'react';

type SetBlurDeps = Pick<
  ActiveWorkoutBase,
  | 'exercises'
  | 'persistSetNow'
  | 'preserveScrollOnNextLayout'
  | 'restDurations'
  | 'setExercises'
  | 'latestSetSnapshotRef'
> & {
  sessionId: string;
  scheduleRestAfterSet: (exerciseId: string) => void;
};

export function useActiveWorkoutSetBlur({
  sessionId,
  exercises,
  persistSetNow,
  preserveScrollOnNextLayout,
  restDurations,
  setExercises,
  latestSetSnapshotRef,
  scheduleRestAfterSet,
}: SetBlurDeps) {
  return useCallback(
    (setId: string, exerciseId: string, field: 'kg' | 'reps') => {
      const set = exercises.flatMap((ex) => ex.sets).find((s) => s.id === setId);
      if (!set) {
        persistSetNow(setId);
        return;
      }
      const snap = latestSetSnapshotRef.current.get(setId);
      const kg = snap?.kg ?? set.kg;
      const reps = snap?.reps ?? set.reps;

      if (field === 'kg') {
        persistSetNow(setId);
        return;
      }

      if (!setHasLoggedRepsAndKg(kg, reps)) {
        persistSetNow(setId);
        return;
      }

      if (!set.completed) {
        preserveScrollOnNextLayout();
        const row = { ...set, kg, reps, completed: true };
        latestSetSnapshotRef.current.set(setId, {
          kg: row.kg,
          reps: row.reps,
          completed: row.completed,
        });
        writeMirrorPatch(
          sessionId,
          setId,
          {
            kg: row.kg,
            reps: row.reps,
            completed: row.completed,
          },
          restDurations
        );
        setExercises((prev) =>
          prev.map((ex) => ({
            ...ex,
            sets: ex.sets.map((s) => (s.id === setId ? row : s)),
          }))
        );
      }

      scheduleRestAfterSet(exerciseId);
      if (!setId.startsWith('temp-')) {
        persistSetNow(setId);
      }
    },
    [
      exercises,
      persistSetNow,
      preserveScrollOnNextLayout,
      restDurations,
      scheduleRestAfterSet,
      sessionId,
      setExercises,
      latestSetSnapshotRef,
    ]
  );
}
