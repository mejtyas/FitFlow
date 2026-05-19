'use client';

import {
  addExerciseToSession,
  removeExerciseFromSession,
} from '@/app/actions/workout-session-exercise-actions';
import { deleteSet } from '@/app/actions/workout-session-sets-actions';
import { updateExerciseDescription } from '@/app/actions/exercises';
import { followerSetIdsToPrefillKg } from '@/app/(dashboard)/dashboard/active/active-workout-prefill';
import { parseSetFieldValue } from '@/app/(dashboard)/dashboard/active/active-workout-set-value';
import {
  migrateMirrorSetId,
  removeMirrorSet,
  writeMirrorPatch,
} from '@/app/(dashboard)/dashboard/active/active-workout-mirror';
import type { SessionExercise } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import type { ActiveWorkoutBase } from '@/app/(dashboard)/dashboard/active/use-active-workout-base';
import type { ActiveWorkoutViewProps } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { useActiveWorkoutSetBlur } from '@/app/(dashboard)/dashboard/active/use-active-workout-set-blur';
import { useCallback } from 'react';

export function useActiveWorkoutActionsSecondary(
  props: ActiveWorkoutViewProps,
  base: ActiveWorkoutBase,
  scheduleRestAfterSet: (exerciseId: string) => void
) {
  const {
    sessionId,
    availableExercises,
  } = props;

  const {
    exercises,
    setExercises,
    latestSetSnapshotRef,
    setSaveDebounceRef,
    restDurations,
    persistSetNow,
    schedulePersistSet,
    addExerciseOpen,
    setAddExerciseOpen,
    editDescriptionValue,
    setEditingDescriptionId,
    preserveScrollOnNextLayout,
  } = base;

  const handleSetChange = useCallback(
    (
      setId: string,
      exerciseId: string,
      field: 'kg' | 'reps',
      value: number | ''
    ) => {
      const num = parseSetFieldValue(field, value);
      const followerIdsToPersist: string[] = [];
      setExercises((prev) => {
        followerIdsToPersist.length = 0;
        return prev.map((ex) => {
          if (!ex.sets.some((s) => s.id === setId)) {
            return ex;
          }

          const sorted = [...ex.sets].sort((a, b) => a.set_index - b.set_index);
          const isFirstSet = sorted[0]?.id === setId;
          const prevFirstKg = isFirstSet ? (sorted[0]?.kg ?? null) : null;
          const prefillKg = field === 'kg' && num !== null ? num : null;
          const prefillFollowerIds =
            prefillKg !== null && isFirstSet && sorted.length > 1
              ? followerSetIdsToPrefillKg(sorted, prevFirstKg)
              : [];
          const prefillSet = new Set(prefillFollowerIds);
          const nextFollowerIds = prefillFollowerIds.filter(
            (fid) => !fid.startsWith('temp-')
          );
          followerIdsToPersist.push(...nextFollowerIds);

          return {
            ...ex,
            sets: ex.sets.map((s) => {
              if (prefillSet.has(s.id) && prefillKg !== null) {
                const withKg = { ...s, kg: prefillKg };
                latestSetSnapshotRef.current.set(s.id, {
                  kg: withKg.kg,
                  reps: withKg.reps,
                  completed: withKg.completed,
                });
                writeMirrorPatch(
                  sessionId,
                  s.id,
                  {
                    kg: withKg.kg,
                    reps: withKg.reps,
                    completed: withKg.completed,
                  },
                  restDurations
                );
                return withKg;
              }
              if (s.id !== setId) {
                return s;
              }
              const withField = { ...s, [field]: num };
              latestSetSnapshotRef.current.set(setId, {
                kg: withField.kg,
                reps: withField.reps,
                completed: withField.completed,
              });
              writeMirrorPatch(
                sessionId,
                setId,
                {
                  kg: withField.kg,
                  reps: withField.reps,
                  completed: withField.completed,
                },
                restDurations
              );
              return withField;
            }),
          };
        });
      });
      if (!setId.startsWith('temp-')) {
        schedulePersistSet(setId);
      }
      followerIdsToPersist.map((fid) => schedulePersistSet(fid));
    },
    [restDurations, schedulePersistSet, sessionId, setExercises, latestSetSnapshotRef]
  );

  const handleSetBlur = useActiveWorkoutSetBlur({
    sessionId,
    exercises,
    persistSetNow,
    preserveScrollOnNextLayout,
    restDurations,
    setExercises,
    latestSetSnapshotRef,
    scheduleRestAfterSet,
  });

  const handleDeleteSet = useCallback(
    async (setId: string) => {
      const snapshotRef = { current: [] as SessionExercise[] };
      setExercises((prev) => {
        snapshotRef.current = prev;
        return prev.map((ex) => ({
          ...ex,
          sets: ex.sets.filter((s) => s.id !== setId),
        }));
      });

      const pendingSave = setSaveDebounceRef.current.get(setId);
      if (pendingSave) {
        clearTimeout(pendingSave);
      }
      setSaveDebounceRef.current.delete(setId);
      latestSetSnapshotRef.current.delete(setId);
      removeMirrorSet(sessionId, setId);

      const result = await deleteSet(sessionId, setId);
      if ('error' in result && result.error) {
        setExercises(snapshotRef.current);
      }
    },
    [sessionId, setExercises, latestSetSnapshotRef, setSaveDebounceRef]
  );

  const handleRemoveExercise = useCallback(
    async (sessionExerciseId: string) => {
      const snapshotRef = { current: [] as SessionExercise[] };
      setExercises((prev) => {
        snapshotRef.current = prev;
        return prev.filter((ex) => ex.id !== sessionExerciseId);
      });

      const result = await removeExerciseFromSession(
        sessionId,
        sessionExerciseId
      );
      if ('error' in result && result.error) {
        setExercises(snapshotRef.current);
      }
    },
    [sessionId, setExercises]
  );

  const handleSaveDescription = useCallback(
    async (exerciseId: string) => {
      await updateExerciseDescription(exerciseId, editDescriptionValue);
      setExercises((prev) =>
        prev.map((ex) =>
          ex.exercise_id === exerciseId
            ? {
                ...ex,
                exercise_description: editDescriptionValue.trim() || null,
              }
            : ex
        )
      );
      setEditingDescriptionId(null);
    },
    [editDescriptionValue, setExercises, setEditingDescriptionId]
  );

  const handleAddExercise = useCallback(
    async (exerciseId: string) => {
      const exercise = availableExercises.find((e) => e.id === exerciseId);
      if (!exercise) {
        return;
      }

      const afterExId = addExerciseOpen;
      const insertIndex = exercises.findIndex((ex) => ex.id === afterExId);
      const insertAtOrder =
        insertIndex !== -1
          ? exercises[insertIndex].order_index + 1
          : exercises.length;
      const insertAtArrayPos =
        insertIndex !== -1 ? insertIndex + 1 : exercises.length;

      const tempExId = `temp-ex-${Date.now()}`;
      const tempSetId = `temp-set-${Date.now()}`;
      const newExercise: SessionExercise = {
        id: tempExId,
        order_index: insertAtOrder,
        exercise_id: exerciseId,
        exercise_name: exercise.name,
        exercise_description: exercise.description,
        sets: [
          {
            id: tempSetId,
            set_index: 0,
            kg: null,
            reps: null,
            completed: false,
          },
        ],
        past_sessions: [],
        warmup_settings: exercise.warmup_settings,
      };

      const shiftsById = exercises
        .slice(insertAtArrayPos)
        .map((ex) => ({ id: ex.id, order_index: ex.order_index + 1 }));

      setExercises((prev) => {
        const updated = prev.map((row, i) =>
          i >= insertAtArrayPos
            ? {
                ...row,
                order_index: row.order_index + 1,
              }
            : row
        );
        updated.splice(insertAtArrayPos, 0, newExercise);
        return updated;
      });
      setAddExerciseOpen(null);

      const result = await addExerciseToSession(
        sessionId,
        exerciseId,
        insertAtOrder,
        shiftsById.length > 0 ? shiftsById : undefined
      );
      if ('error' in result && result.error) {
        setExercises((prev) => prev.filter((ex) => ex.id !== tempExId));
        return;
      }

      if (
        'sessionExercise' in result &&
        'initialSet' in result &&
        result.sessionExercise &&
        result.initialSet
      ) {
        const realEx = result.sessionExercise;
        const realSet = result.initialSet;
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === tempExId
              ? {
                  ...ex,
                  id: realEx.id,
                  order_index: realEx.order_index,
                  sets: [
                    {
                      ...realSet,
                      kg: ex.sets[0]?.kg ?? realSet.kg,
                      reps: ex.sets[0]?.reps ?? realSet.reps,
                      completed:
                        ex.sets[0]?.completed ?? realSet.completed ?? false,
                    },
                  ],
                }
              : ex
          )
        );
        const snap = latestSetSnapshotRef.current.get(tempSetId);
        const tmr = setSaveDebounceRef.current.get(tempSetId);
        if (tmr) {
          clearTimeout(tmr);
          setSaveDebounceRef.current.delete(tempSetId);
        }
        latestSetSnapshotRef.current.delete(tempSetId);
        if (
          snap &&
          ((snap.kg !== null && snap.kg !== undefined) ||
            (snap.reps !== null && snap.reps !== undefined))
        ) {
          latestSetSnapshotRef.current.set(realSet.id, snap);
          migrateMirrorSetId(sessionId, tempSetId, realSet.id);
          schedulePersistSet(realSet.id);
        }
      }
    },
    [
      sessionId,
      availableExercises,
      addExerciseOpen,
      exercises,
      schedulePersistSet,
      setExercises,
      latestSetSnapshotRef,
      setSaveDebounceRef,
      setAddExerciseOpen,
    ]
  );

  return {
    handleSetChange,
    handleSetBlur,
    handleDeleteSet,
    handleRemoveExercise,
    handleSaveDescription,
    handleAddExercise,
  };
}
