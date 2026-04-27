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
      <div className="p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 space-y-3 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
            Add Exercise
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
              className="rounded-xl font-bold h-8 px-3 text-xs hover:bg-primary hover:text-primary-foreground transition-all"
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
    <div className="flex justify-center">
      <button
        type="button"
        className="size-7 rounded-full border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/10 hover:text-primary text-muted-foreground/40 flex items-center justify-center transition-all"
        onClick={onOpen}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
