'use client';

import type { SessionExercise } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { cn } from '@/lib/utils';
import { MoreHorizontal, Plus } from 'lucide-react';

type ActiveWorkoutExerciseRailProps = {
  exercises: SessionExercise[];
  selectedExerciseId: string | null;
  onSelect: (sessionExerciseId: string) => void;
  onAddExercise: () => void;
};

function ExerciseSetDots({ ex }: { ex: SessionExercise }) {
  return (
    <span className="flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground">
      {ex.sets.map((set) => (
        <span key={set.id} className={set.completed ? 'text-primary' : ''}>
          {set.completed ? '●' : '○'}
        </span>
      ))}
    </span>
  );
}

export function ActiveWorkoutExerciseRail({
  exercises,
  selectedExerciseId,
  onSelect,
  onAddExercise,
}: ActiveWorkoutExerciseRailProps) {
  const selectedIndex = exercises.findIndex((ex) => ex.id === selectedExerciseId);

  return (
    <aside className="rounded-xl border border-border bg-card p-2 lg:sticky lg:top-6">
      <div className="flex items-center justify-between px-3 pb-2 pt-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Exercises
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {Math.max(selectedIndex + 1, 1)} / {exercises.length}
        </p>
      </div>
      <div className="space-y-1">
        {exercises.map((ex, index) => {
          const completedCount = ex.sets.filter((set) => set.completed).length;
          const isDone = ex.sets.length > 0 && completedCount === ex.sets.length;
          const isActive = ex.id === selectedExerciseId;

          return (
            <button
              key={ex.id}
              type="button"
              className={cn(
                'relative grid w-full cursor-pointer grid-cols-[1.5rem_1fr_auto] items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 hover:bg-secondary',
                isActive && 'bg-secondary before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-r before:bg-primary'
              )}
              onClick={() => onSelect(ex.id)}
            >
              <span
                className={cn(
                  'grid size-5 place-items-center rounded-full border border-border font-mono text-[10.5px] font-semibold text-muted-foreground',
                  isDone && 'border-primary bg-primary text-primary-foreground',
                  isActive && !isDone && 'border-primary text-primary'
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block truncate text-sm font-medium leading-tight text-foreground',
                    isDone && 'text-muted-foreground line-through'
                  )}
                >
                  {ex.exercise_name}
                </span>
                <span className="mt-1 block truncate font-mono text-[10.5px] text-muted-foreground">
                  {completedCount} / {ex.sets.length} sets
                </span>
              </span>
              <ExerciseSetDots ex={ex} />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/35 hover:text-primary"
        onClick={onAddExercise}
      >
        <Plus className="size-3.5" aria-hidden />
        Add exercise
      </button>
      <div className="mt-2 flex justify-center text-muted-foreground">
        <MoreHorizontal className="size-4" aria-hidden />
      </div>
    </aside>
  );
}
