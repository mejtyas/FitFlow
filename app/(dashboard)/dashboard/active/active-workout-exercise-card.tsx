'use client';

import { ActiveWorkoutExercisePastAndWarmup } from '@/app/(dashboard)/dashboard/active/active-workout-exercise-past-warmup';
import { REST_PRESET_SECONDS } from '@/app/(dashboard)/dashboard/active/active-workout-constants';
import { getDefaultRestSeconds } from '@/lib/rest-preferences';
import { formatSecondsAsClock } from '@/app/(dashboard)/dashboard/active/active-workout-format';
import type { SessionExercise } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { Button } from '@/components/ui/button';
import { ActiveWorkoutSetNumericInput } from '@/app/(dashboard)/dashboard/active/active-workout-set-numeric-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check, Clock, Plus, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

type ActiveWorkoutExerciseCardProps = {
  ex: SessionExercise;
  exerciseDone: boolean;
  restDurations: Record<string, number>;
  restPickerOpen: string | null;
  setRestPickerOpen: Dispatch<SetStateAction<string | null>>;
  customRestDraft: string;
  setCustomRestDraft: (s: string) => void;
  setRestDurations: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  editingDescriptionId: string | null;
  setEditingDescriptionId: (id: string | null) => void;
  editDescriptionValue: string;
  setEditDescriptionValue: (s: string) => void;
  onRemoveExercise: (sessionExerciseId: string) => void;
  onSaveDescription: (exerciseId: string) => void;
  onSetChange: (
    setId: string,
    exerciseId: string,
    field: 'kg' | 'reps',
    value: number | ''
  ) => void;
  onPersistSetNow: (setId: string) => void;
  onSetBlur: (setId: string, exerciseId: string, field: 'kg' | 'reps') => void;
  onConfirmSet: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: (sessionExerciseId: string) => void;
};

export function ActiveWorkoutExerciseCard({
  ex,
  exerciseDone,
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
  onRemoveExercise,
  onSaveDescription,
  onSetChange,
  onPersistSetNow,
  onSetBlur,
  onConfirmSet,
  onDeleteSet,
  onAddSet,
}: ActiveWorkoutExerciseCardProps) {
  const displaySets = [...ex.sets].sort((a, b) => a.set_index - b.set_index);
  const firstPendingSetId = displaySets.find((set) => !set.completed)?.id ?? null;

  const commitCustomRestSeconds = () => {
    const v = parseInt(customRestDraft, 10);
    if (!Number.isFinite(v)) {
      return;
    }
    const clamped = Math.min(3600, Math.max(10, v));
    setRestDurations((prev) => ({ ...prev, [ex.exercise_id]: clamped }));
    setRestPickerOpen(null);
  };

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card p-4 shadow-lg shadow-black/10 transition-colors duration-300 md:p-5',
        exerciseDone
          ? 'border-primary/35'
          : 'border-muted/60'
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight">
            {ex.exercise_name}
          </h2>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {ex.exercise_description || `${ex.sets.length} sets · target 8-12 reps`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
            <div className="relative" id={`rest-picker-${ex.exercise_id}`}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
              className="h-8 gap-1 rounded-lg border border-border bg-secondary px-3 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setRestPickerOpen((o) => {
                    const opening = o !== ex.exercise_id;
                    if (opening) {
                      setCustomRestDraft(
                        String(restDurations[ex.exercise_id] ?? getDefaultRestSeconds())
                      );
                      return ex.exercise_id;
                    }
                    return null;
                  });
                }}
              >
              <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
                Rest{' '}
                {formatSecondsAsClock(
                  restDurations[ex.exercise_id] ?? getDefaultRestSeconds()
                )}
              </Button>
              {restPickerOpen === ex.exercise_id ? (
                <div
                  className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,280px)] rounded-xl border bg-popover p-3 shadow-lg animate-in fade-in zoom-in-95 duration-150"
                  role="dialog"
                  aria-label="Rest duration for this exercise"
                >
                <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Rest between sets
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {REST_PRESET_SECONDS.map((sec) => {
                      const active =
                        (restDurations[ex.exercise_id] ?? getDefaultRestSeconds()) ===
                        sec;
                      return (
                        <Button
                          key={sec}
                          type="button"
                          size="sm"
                          variant={active ? 'default' : 'outline'}
                        className="h-8 rounded-lg px-2 text-xs font-semibold tabular-nums"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRestDurations((prev) => ({
                              ...prev,
                              [ex.exercise_id]: sec,
                            }));
                            setCustomRestDraft(String(sec));
                          }}
                        >
                          {formatSecondsAsClock(sec)}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={`custom-rest-${ex.exercise_id}`}
                        className="text-[10px] uppercase font-black text-muted-foreground"
                      >
                        Custom (seconds)
                      </Label>
                      <Input
                        id={`custom-rest-${ex.exercise_id}`}
                        type="number"
                        min={10}
                        max={3600}
                        step={5}
                        value={customRestDraft}
                        onChange={(e) => setCustomRestDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            commitCustomRestSeconds();
                          }
                        }}
                      className="h-9 rounded-lg font-mono font-medium"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                    className="h-9 shrink-0 font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        commitCustomRestSeconds();
                      }}
                    >
                      Set
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 cursor-pointer rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={`Remove ${ex.exercise_name} from session`}
            onClick={() => void onRemoveExercise(ex.id)}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <ActiveWorkoutExercisePastAndWarmup
        ex={ex}
        onEditNote={() => {
          setEditingDescriptionId(ex.exercise_id);
          setEditDescriptionValue(ex.exercise_description ?? '');
        }}
      />

        {editingDescriptionId === ex.exercise_id ? (
          <Input
            value={editDescriptionValue}
            onChange={(e) => setEditDescriptionValue(e.target.value)}
            placeholder="Add notes (machine settings, form cues...)"
          className="mb-4 h-9 rounded-lg bg-secondary text-sm"
            autoFocus
            onBlur={() => onSaveDescription(ex.exercise_id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveDescription(ex.exercise_id);
              }
              if (e.key === 'Escape') {
                setEditingDescriptionId(null);
              }
            }}
          />
      ) : null}

        {ex.sets.length > 0 && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[42rem] grid-cols-[2.25rem_1fr_1fr_1fr_4.5rem_2.75rem_2.75rem] items-center gap-x-3">
            {['Set', 'Previous', 'Weight (kg)', 'Reps', 'RPE', '✓', ''].map(
              (heading) => (
                <div
                  key={heading || 'delete'}
                  className="px-1 pb-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {heading}
                </div>
              )
            )}

            {displaySets.map((set) => {
              const previousSet = ex.past_sessions[0]?.sets[set.set_index];
              const previousLabel = previousSet
                ? `${previousSet.kg ?? 0} × ${previousSet.reps ?? 0}`
                : '—';
              const isActive = set.id === firstPendingSetId;

              return (
                <div key={set.id} className="contents">
                  <div
                    className={cn(
                      'relative border-t border-border px-1 py-2 text-center font-mono text-sm font-semibold',
                      isActive && 'text-primary before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded before:bg-primary',
                      set.completed && 'text-muted-foreground'
                    )}
                  >
                    {set.set_index + 1}
                  </div>
                  <div className="border-t border-border px-1 py-2">
                    <button
                      type="button"
                      className="cursor-pointer rounded-md px-2 py-1 font-mono text-xs text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
                    >
                      {previousLabel}
                    </button>
                  </div>
                  {(
                    [
                      { field: 'kg' as const, raw: set.kg },
                      { field: 'reps' as const, raw: set.reps },
                    ] as const
                  ).map((cfg) => (
                    <div key={cfg.field} className="border-t border-border px-1 py-2">
                      <ActiveWorkoutSetNumericInput
                        id={`${cfg.field}-${set.id}`}
                        field={cfg.field}
                        value={cfg.raw}
                        onChange={(v) =>
                          onSetChange(set.id, ex.exercise_id, cfg.field, v)
                        }
                        onBlur={() => {
                          onPersistSetNow(set.id);
                          onSetBlur(set.id, ex.exercise_id, cfg.field);
                        }}
                        className={cn(
                          'h-9 rounded-lg border-border bg-secondary font-mono font-medium transition-colors focus:bg-background',
                          set.completed && 'border-transparent bg-transparent text-muted-foreground line-through'
                        )}
                      />
                    </div>
                  ))}
                  <div className="border-t border-border px-1 py-2">
                    <button
                      type="button"
                      className={cn(
                        'mx-auto flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary px-2 font-mono text-xs text-muted-foreground',
                        set.completed && 'border-primary/35 bg-primary/10 text-primary'
                      )}
                    >
                      {set.completed ? '8' : '—'}
                    </button>
                  </div>
                  <div className="border-t border-border px-1 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'mx-auto size-9 cursor-pointer rounded-lg border border-border bg-secondary text-muted-foreground transition-colors duration-200 hover:border-primary/35 hover:text-primary',
                        set.completed && 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                      )}
                      onClick={() => onConfirmSet(set.id)}
                    >
                      <Check className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                  <div className="border-t border-border px-1 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mx-auto size-8 cursor-pointer rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDeleteSet(set.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 flex-1 cursor-pointer rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/35 hover:text-primary"
          onClick={() => onAddSet(ex.id)}
        >
          <Plus className="size-3.5" aria-hidden />
          Add set
        </Button>
        <button
          type="button"
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <Clock className="size-3.5" aria-hidden />
          Log warm-up
        </button>
      </div>
    </section>
  );
}
