'use client';

import type {
  ExerciseOption,
  SessionExercise,
} from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

type ActiveWorkoutAddExerciseSlotProps = {
  open: boolean;
  exercises: SessionExercise[];
  availableExercises: ExerciseOption[];
  onOpen: () => void;
  onClose: () => void;
  onPickExercise: (exerciseId: string) => void;
};

export function ActiveWorkoutAddExerciseSlot({
  open,
  exercises,
  availableExercises,
  onOpen,
  onClose,
  onPickExercise,
}: ActiveWorkoutAddExerciseSlotProps) {
  const remaining = availableExercises.filter(
    (e) => !exercises.some((se) => se.exercise_id === e.id)
  );

  if (open) {
    return (
      <div className="animate-in fade-in zoom-in-95 space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary/10 p-3 duration-200">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Add exercise
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 rounded-full"
            onClick={onClose}
          >
            <X className="size-3" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {remaining.map((e) => (
            <Button
              key={e.id}
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 rounded-lg px-3 text-xs font-semibold transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
              onClick={() => onPickExercise(e.id)}
            >
              {e.name}
            </Button>
          ))}
        </div>
        {remaining.length === 0 && (
          <p className="text-xs text-center py-2 text-muted-foreground font-medium italic">
            All exercises are already added.
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/35 hover:text-primary"
      onClick={onOpen}
    >
      <Plus className="size-4" aria-hidden />
      Add exercise to this workout
    </button>
  );
}
