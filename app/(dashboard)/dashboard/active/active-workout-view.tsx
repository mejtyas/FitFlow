'use client';

import { ActiveWorkoutAddExerciseSlot } from '@/app/(dashboard)/dashboard/active/active-workout-add-exercise-slot';
import { ActiveWorkoutExerciseCard } from '@/app/(dashboard)/dashboard/active/active-workout-exercise-card';
import { ActiveWorkoutExerciseRail } from '@/app/(dashboard)/dashboard/active/active-workout-exercise-rail';
import {
  ActiveWorkoutRestDock,
  ActiveWorkoutStickyBar,
} from '@/app/(dashboard)/dashboard/active/active-workout-sticky-bar';
import type { ActiveWorkoutViewProps } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { useActiveWorkoutActionsPrimary } from '@/app/(dashboard)/dashboard/active/use-active-workout-actions-primary';
import { useActiveWorkoutActionsSecondary } from '@/app/(dashboard)/dashboard/active/use-active-workout-actions-secondary';
import { useActiveWorkoutBase } from '@/app/(dashboard)/dashboard/active/use-active-workout-base';
import { useActiveWorkoutSyncEffects } from '@/app/(dashboard)/dashboard/active/use-active-workout-sync-effects';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export function ActiveWorkoutView(props: ActiveWorkoutViewProps) {
  const { workoutName, availableExercises } = props;
  const router = useRouter();
  const base = useActiveWorkoutBase(props);
  useActiveWorkoutSyncEffects(props, base);

  const primary = useActiveWorkoutActionsPrimary(props, base, router);

  const secondary = useActiveWorkoutActionsSecondary(
    props,
    base,
    primary.scheduleRestAfterSet
  );

  const {
    exercises,
    elapsed,
    restAlarmFlash,
    restTargetMs,
    restRemainingMs,
    restPaused,
    ending,
    restDurations,
    restPickerOpen,
    setRestPickerOpen,
    customRestDraft,
    setCustomRestDraft,
    setRestDurations,
    editingDescriptionId,
    setEditingDescriptionId,
    editDescriptionValue,
    setEditDescriptionValue,
    alarmConsumedRef,
    applyServerRestState,
    syncRestTimer,
    persistSetNow,
    setRestAlarmFlash,
    setAddExerciseOpen,
    addExerciseOpen,
  } = base;

  const setsDoneCount = exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSetsCount = exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const volumeKg = exercises.reduce(
    (total, ex) =>
      total +
      ex.sets.reduce(
        (exerciseTotal, set) =>
          exerciseTotal +
          (set.completed && set.kg !== null && set.reps !== null
            ? set.kg * set.reps
            : 0),
        0
      ),
    0
  );
  const defaultSelectedExerciseId = useMemo(
    () =>
      exercises.find((ex) => ex.sets.some((set) => !set.completed))?.id ??
      exercises[0]?.id ??
      null,
    [exercises]
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    defaultSelectedExerciseId
  );
  const effectiveSelectedExerciseId =
    selectedExerciseId && exercises.some((ex) => ex.id === selectedExerciseId)
      ? selectedExerciseId
      : defaultSelectedExerciseId;

  const currentExercise =
    exercises.find((ex) => ex.id === effectiveSelectedExerciseId) ??
    exercises.find((ex) => ex.id === defaultSelectedExerciseId) ??
    null;
  const currentExerciseDone =
    !!currentExercise &&
    currentExercise.sets.length > 0 &&
    currentExercise.sets.every((set) => set.completed);
  const currentPendingSet =
    currentExercise?.sets
      .filter((set) => !set.completed)
      .sort((a, b) => a.set_index - b.set_index)[0] ?? null;
  const currentExerciseLabel = currentExercise
    ? `${currentExercise.exercise_name} · set ${
        (currentPendingSet?.set_index ?? currentExercise.sets.at(-1)?.set_index ?? 0) + 1
      } of ${currentExercise.sets.length}`
    : 'No exercises';
  const nextExercise = currentExercise
    ? exercises[exercises.findIndex((ex) => ex.id === currentExercise.id) + 1] ?? null
    : null;
  const addExerciseSlotId = currentExercise?.id ?? 'active-workout-end';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pb-24 duration-300">
      <ActiveWorkoutStickyBar
        workoutName={workoutName}
        elapsedMs={elapsed}
        setsDoneCount={setsDoneCount}
        totalSetsCount={totalSetsCount}
        volumeKg={volumeKg}
        currentExerciseLabel={currentExerciseLabel}
        ending={ending}
        onEnd={primary.handleEnd}
        restAlarmFlash={restAlarmFlash}
        restTargetMs={restTargetMs}
        restRemainingMs={restRemainingMs}
        restPaused={restPaused}
        startRestCountdown={primary.startRestCountdown}
        syncRestTimer={syncRestTimer}
        applyServerRestState={applyServerRestState}
        alarmConsumedRef={alarmConsumedRef}
        setRestAlarmFlash={setRestAlarmFlash}
      />

      <div className="grid gap-4 lg:grid-cols-[17.5rem_1fr] lg:items-start">
        <ActiveWorkoutExerciseRail
          exercises={exercises}
          selectedExerciseId={currentExercise?.id ?? null}
          onSelect={setSelectedExerciseId}
          onAddExercise={() => setAddExerciseOpen(addExerciseSlotId)}
        />

        <div className="space-y-3">
          {currentExercise ? (
            <ActiveWorkoutExerciseCard
              ex={currentExercise}
              exerciseDone={currentExerciseDone}
              restDurations={restDurations}
              restPickerOpen={restPickerOpen}
              setRestPickerOpen={setRestPickerOpen}
              customRestDraft={customRestDraft}
              setCustomRestDraft={setCustomRestDraft}
              setRestDurations={setRestDurations}
              editingDescriptionId={editingDescriptionId}
              setEditingDescriptionId={setEditingDescriptionId}
              editDescriptionValue={editDescriptionValue}
              setEditDescriptionValue={setEditDescriptionValue}
              onRemoveExercise={secondary.handleRemoveExercise}
              onSaveDescription={secondary.handleSaveDescription}
              onSetChange={secondary.handleSetChange}
              onSetBlur={secondary.handleSetBlur}
              onPersistSetNow={persistSetNow}
              onConfirmSet={primary.handleConfirmSet}
              onDeleteSet={secondary.handleDeleteSet}
              onAddSet={primary.handleAddSet}
            />
          ) : null}

          {nextExercise ? (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left opacity-70 transition-opacity duration-200 hover:opacity-100"
              onClick={() => setSelectedExerciseId(nextExercise.id)}
            >
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold tracking-tight">
                  {nextExercise.exercise_name}
                </span>
                <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                  {nextExercise.exercise_description ||
                    `${nextExercise.sets.length} sets · up next`}
                </span>
              </span>
              <span className="rounded-lg border border-border bg-secondary px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Up next
              </span>
            </button>
          ) : null}

          <ActiveWorkoutAddExerciseSlot
            open={addExerciseOpen === addExerciseSlotId}
            exercises={exercises}
            availableExercises={availableExercises}
            onOpen={() => setAddExerciseOpen(addExerciseSlotId)}
            onClose={() => setAddExerciseOpen(null)}
            onPickExercise={(id) => void secondary.handleAddExercise(id)}
          />
        </div>
      </div>

      <ActiveWorkoutRestDock
        restAlarmFlash={restAlarmFlash}
        restTargetMs={restTargetMs}
        restRemainingMs={restRemainingMs}
        restPaused={restPaused}
        startRestCountdown={primary.startRestCountdown}
        syncRestTimer={syncRestTimer}
        applyServerRestState={applyServerRestState}
        alarmConsumedRef={alarmConsumedRef}
        setRestAlarmFlash={setRestAlarmFlash}
      />
    </div>
  );
}
