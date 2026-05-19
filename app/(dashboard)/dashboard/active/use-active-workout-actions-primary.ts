'use client';

import { endWorkout } from '@/app/actions/workout-session';
import { addSetToSessionExercise } from '@/app/actions/workout-session-sets-actions';
import { postSessionSetsFlush } from '@/lib/workout-session/post-session-sets-flush-client';
import { resolveRestSeconds } from '@/lib/rest-preferences';
import {
  clearMirror,
  migrateMirrorSetId,
  writeMirrorPatch,
} from '@/app/(dashboard)/dashboard/active/active-workout-mirror';
import type { ActiveWorkoutBase } from '@/app/(dashboard)/dashboard/active/use-active-workout-base';
import type { ActiveWorkoutViewProps } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { useCallback } from 'react';

export function useActiveWorkoutActionsPrimary(
  { sessionId }: ActiveWorkoutViewProps,
  base: ActiveWorkoutBase,
  router: { push: (href: string) => void; refresh: () => void }
) {
  const {
    exercises,
    setExercises,
    latestSetSnapshotRef,
    setSaveDebounceRef,
    alarmConsumedRef,
    setRestAlarmFlash,
    applyServerRestState,
    syncRestTimer,
    restDurations,
    schedulePersistSet,
    setEnding,
    preserveScrollOnNextLayout,
  } = base;

  const startRestCountdown = useCallback(
    async (durationSeconds: number) => {
      const ms = Math.max(1000, durationSeconds * 1000);
      const r = await syncRestTimer({
        kind: 'start',
        durationMs: ms,
      });
      if (r.error || !r.state) {
        return;
      }
      alarmConsumedRef.current = false;
      setRestAlarmFlash(false);
      applyServerRestState(r.state);
    },
    [syncRestTimer, applyServerRestState, alarmConsumedRef, setRestAlarmFlash]
  );

  const scheduleRestAfterSet = useCallback(
    (exerciseId: string) => {
      const restSec = resolveRestSeconds(exerciseId, restDurations);
      queueMicrotask(() => {
        void startRestCountdown(restSec);
      });
    },
    [restDurations, startRestCountdown]
  );

  const handleConfirmSet = useCallback(
    (setId: string) => {
      if (setId.startsWith('temp-')) {
        preserveScrollOnNextLayout();
        setExercises((prev) =>
          prev.map((ex) => ({
            ...ex,
            sets: ex.sets.map((s) =>
              s.id === setId ? { ...s, completed: !s.completed } : s
            ),
          }))
        );
        return;
      }

      const toggleMeta = {
        completed: undefined as boolean | undefined,
        exerciseId: undefined as string | undefined,
      };
      preserveScrollOnNextLayout();
      setExercises((prev) =>
        prev.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) {
              return s;
            }
            toggleMeta.exerciseId = ex.exercise_id;
            const completed = !s.completed;
            toggleMeta.completed = completed;
            const row = { ...s, completed };
            latestSetSnapshotRef.current.set(setId, {
              kg: row.kg,
              reps: row.reps,
              completed: row.completed,
            });
            return row;
          }),
        }))
      );

      if (toggleMeta.completed === undefined) {
        return;
      }

      if (toggleMeta.completed && toggleMeta.exerciseId) {
        scheduleRestAfterSet(toggleMeta.exerciseId);
      }

      const snap = latestSetSnapshotRef.current.get(setId);
      const row = exercises
        .flatMap((ex) => ex.sets)
        .find((s) => s.id === setId);
      const kg = snap?.kg ?? row?.kg ?? null;
      const reps = snap?.reps ?? row?.reps ?? null;
      const completed = toggleMeta.completed;

      if (row && (snap || kg !== null || reps !== null)) {
        latestSetSnapshotRef.current.set(setId, {
          kg,
          reps,
          completed,
        });
        writeMirrorPatch(
          sessionId,
          setId,
          { kg, reps, completed },
          restDurations
        );
        if (!setId.startsWith('temp-')) {
          void postSessionSetsFlush(sessionId, [
            { setId, kg, reps, completed },
          ]).then((r) => {
            if ('error' in r) {
              console.error('Failed to save set completed state', r.error);
            }
          });
        }
      }
    },
    [
      sessionId,
      restDurations,
      scheduleRestAfterSet,
      exercises,
      setExercises,
      latestSetSnapshotRef,
      preserveScrollOnNextLayout,
    ]
  );

  const handleEnd = useCallback(async () => {
    setEnding(true);
    const result = await endWorkout(sessionId);
    if ('error' in result && result.error) {
      setEnding(false);
      return;
    }
    clearMirror(sessionId);
    router.push('/dashboard');
    router.refresh();
  }, [sessionId, router, setEnding]);

  const handleAddSet = useCallback(
    async (sessionExerciseId: string) => {
      const tempId = `temp-${Date.now()}`;
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === sessionExerciseId
            ? {
                ...ex,
                sets: [
                  ...ex.sets,
                  {
                    id: tempId,
                    set_index:
                      ex.sets.length > 0
                        ? Math.max(...ex.sets.map((s) => s.set_index)) + 1
                        : 0,
                    kg: null,
                    reps: null,
                    completed: false,
                  },
                ],
              }
            : ex
        )
      );

      const result = await addSetToSessionExercise(sessionId, sessionExerciseId);
      if ('error' in result && result.error) {
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === sessionExerciseId
              ? { ...ex, sets: ex.sets.filter((s) => s.id !== tempId) }
              : ex
          )
        );
        return;
      }

      if ('set' in result && result.set) {
        const newSet = result.set;
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === sessionExerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((s) =>
                    s.id === tempId
                      ? {
                          ...newSet,
                          kg: s.kg,
                          reps: s.reps,
                          completed: s.completed,
                        }
                      : s
                  ),
                }
              : ex
          )
        );
        const snap = latestSetSnapshotRef.current.get(tempId);
        const tmr = setSaveDebounceRef.current.get(tempId);
        if (tmr) {
          clearTimeout(tmr);
          setSaveDebounceRef.current.delete(tempId);
        }
        latestSetSnapshotRef.current.delete(tempId);
        if (
          snap &&
          ((snap.kg !== null && snap.kg !== undefined) ||
            (snap.reps !== null && snap.reps !== undefined) ||
            snap.completed)
        ) {
          latestSetSnapshotRef.current.set(newSet.id, snap);
          migrateMirrorSetId(sessionId, tempId, newSet.id);
          schedulePersistSet(newSet.id);
        }
      }
    },
    [schedulePersistSet, sessionId, setExercises, latestSetSnapshotRef, setSaveDebounceRef]
  );

  return {
    startRestCountdown,
    scheduleRestAfterSet,
    handleConfirmSet,
    handleEnd,
    handleAddSet,
  };
}
