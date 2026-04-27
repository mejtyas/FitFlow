'use client';

import { ActiveWorkoutAddExerciseSlot } from '@/app/(dashboard)/dashboard/active/active-workout-add-exercise-slot';
import { ActiveWorkoutExerciseCard } from '@/app/(dashboard)/dashboard/active/active-workout-exercise-card';
import { ActiveWorkoutStickyBar } from '@/app/(dashboard)/dashboard/active/active-workout-sticky-bar';
import type { ActiveWorkoutViewProps } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { useActiveWorkoutActionsPrimary } from '@/app/(dashboard)/dashboard/active/use-active-workout-actions-primary';
import { useActiveWorkoutActionsSecondary } from '@/app/(dashboard)/dashboard/active/use-active-workout-actions-secondary';
import { useActiveWorkoutBase } from '@/app/(dashboard)/dashboard/active/use-active-workout-base';
import { useActiveWorkoutSyncEffects } from '@/app/(dashboard)/dashboard/active/use-active-workout-sync-effects';
import { useRouter } from 'next/navigation';

export function ActiveWorkoutView(props: ActiveWorkoutViewProps) {
  const { workoutName, availableExercises } = props;
  const router = useRouter();
  const base = useActiveWorkoutBase(props);
  useActiveWorkoutSyncEffects(props, base);

  const primary = useActiveWorkoutActionsPrimary(props, base, router);

  const secondary = useActiveWorkoutActionsSecondary(
    props,
    base,
    primary.startRestCountdown
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      <ActiveWorkoutStickyBar
        workoutName={workoutName}
        elapsedMs={elapsed}
        setsDoneCount={setsDoneCount}
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

      <div className="grid gap-4 max-w-2xl mx-auto">
        {exercises.map((ex) => {
          const exerciseDone =
            ex.sets.length > 0 && ex.sets.every((s) => s.completed);
          return (
            <div key={ex.id} className="space-y-2">
              <ActiveWorkoutExerciseCard
                ex={ex}
                exerciseDone={exerciseDone}
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
                onPersistSetNow={persistSetNow}
                onConfirmSet={primary.handleConfirmSet}
                onDeleteSet={secondary.handleDeleteSet}
                onAddSet={primary.handleAddSet}
              />
              <ActiveWorkoutAddExerciseSlot
                open={addExerciseOpen === ex.id}
                exercises={exercises}
                availableExercises={availableExercises}
                onOpen={() => setAddExerciseOpen(ex.id)}
                onClose={() => setAddExerciseOpen(null)}
                onPickExercise={(id) => void secondary.handleAddExercise(id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
