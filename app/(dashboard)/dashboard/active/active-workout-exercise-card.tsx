'use client';

import { ActiveWorkoutExercisePastAndWarmup } from '@/app/(dashboard)/dashboard/active/active-workout-exercise-past-warmup';
import {
  REST_DEFAULT_SECONDS,
  REST_PRESET_SECONDS,
} from '@/app/(dashboard)/dashboard/active/active-workout-constants';
import { formatSecondsAsClock } from '@/app/(dashboard)/dashboard/active/active-workout-format';
import type { SessionExercise } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  onConfirmSet,
  onDeleteSet,
  onAddSet,
}: ActiveWorkoutExerciseCardProps) {
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
    <Card
      className={cn(
        'overflow-hidden shadow-sm transition-colors duration-300',
        exerciseDone
          ? 'border-green-600/45 dark:border-green-500/40 shadow-green-500/10'
          : 'border-muted/60'
      )}
    >
      <CardHeader
        className={cn(
          'py-3 px-4 border-b transition-colors duration-300',
          exerciseDone
            ? 'bg-green-500/15 dark:bg-green-500/12 border-green-500/25'
            : 'bg-muted/30'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className={cn(
              'text-sm font-bold tracking-tight min-w-0 pt-0.5 transition-colors',
              exerciseDone && 'text-green-800 dark:text-green-400'
            )}
          >
            {ex.exercise_name}
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
              aria-label={`Remove ${ex.exercise_name} from session`}
              onClick={() => void onRemoveExercise(ex.id)}
            >
              <Trash2 className="size-4" />
            </Button>
            <div className="relative" id={`rest-picker-${ex.exercise_id}`}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 rounded-lg px-2 text-[10px] font-black uppercase tracking-tight"
                onClick={(e) => {
                  e.stopPropagation();
                  setRestPickerOpen((o) => {
                    const opening = o !== ex.exercise_id;
                    if (opening) {
                      setCustomRestDraft(
                        String(restDurations[ex.exercise_id] ?? REST_DEFAULT_SECONDS)
                      );
                      return ex.exercise_id;
                    }
                    return null;
                  });
                }}
              >
                <Clock className="size-3 shrink-0 opacity-70" aria-hidden />
                Rest{' '}
                {formatSecondsAsClock(
                  restDurations[ex.exercise_id] ?? REST_DEFAULT_SECONDS
                )}
              </Button>
              {restPickerOpen === ex.exercise_id ? (
                <div
                  className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,280px)] rounded-xl border bg-popover p-3 shadow-lg animate-in fade-in zoom-in-95 duration-150"
                  role="dialog"
                  aria-label="Rest duration for this exercise"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                    Rest between sets
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {REST_PRESET_SECONDS.map((sec) => {
                      const active =
                        (restDurations[ex.exercise_id] ?? REST_DEFAULT_SECONDS) ===
                        sec;
                      return (
                        <Button
                          key={sec}
                          type="button"
                          size="sm"
                          variant={active ? 'default' : 'outline'}
                          className="h-8 rounded-lg px-2 text-xs font-bold tabular-nums"
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
                        className="h-9 rounded-lg font-bold"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 shrink-0 font-bold"
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
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap pt-1">
              {ex.sets.length} {ex.sets.length === 1 ? 'Set' : 'Sets'}
            </div>
          </div>
        </div>
        {editingDescriptionId === ex.exercise_id ? (
          <Input
            value={editDescriptionValue}
            onChange={(e) => setEditDescriptionValue(e.target.value)}
            placeholder="Add notes (machine settings, form cues...)"
            className="h-7 text-xs mt-1 rounded-lg bg-background/50"
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
        ) : (
          <button
            type="button"
            className="text-left w-full"
            onClick={() => {
              setEditingDescriptionId(ex.exercise_id);
              setEditDescriptionValue(ex.exercise_description ?? '');
            }}
          >
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {ex.exercise_description || 'Add notes...'}
            </p>
          </button>
        )}
      </CardHeader>
      <CardContent
        className={cn(
          'p-3 space-y-2 transition-colors duration-300',
          exerciseDone && 'bg-green-500/[0.06] dark:bg-green-500/[0.08]'
        )}
      >
        <ActiveWorkoutExercisePastAndWarmup ex={ex} />
        {ex.sets.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_40px_40px] gap-3 px-1 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
              KG
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
              Reps
            </span>
            <span className="sr-only">Done</span>
            <span className="sr-only">Delete</span>
          </div>
        )}
        {ex.sets.map((set, index) => (
          <div
            key={set.id}
            className="grid grid-cols-[1fr_1fr_40px_40px] gap-3 items-center animate-in fade-in slide-in-from-left-2 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {(
              [
                {
                  field: 'kg' as const,
                  step: 0.5,
                  raw: set.kg,
                  parse: (v: string) => parseFloat(v),
                },
                {
                  field: 'reps' as const,
                  step: 1,
                  raw: set.reps,
                  parse: (v: string) => parseInt(v, 10),
                },
              ] as const
            ).map((cfg) => (
              <div key={cfg.field} className="relative">
                <Input
                  id={`${cfg.field}-${set.id}`}
                  type="number"
                  min={0}
                  step={cfg.step}
                  placeholder="0"
                  value={cfg.raw ?? ''}
                  onChange={(e) =>
                    onSetChange(
                      set.id,
                      ex.exercise_id,
                      cfg.field,
                      e.target.value === '' ? '' : cfg.parse(e.target.value)
                    )
                  }
                  onBlur={() => onPersistSetNow(set.id)}
                  className="h-9 rounded-xl font-bold bg-background/50 focus:bg-background transition-colors"
                />
              </div>
            ))}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`size-8 rounded-full transition-colors ${
                  set.completed
                    ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25'
                    : 'text-muted-foreground/30 hover:text-green-600 hover:bg-green-500/10'
                }`}
                onClick={() => onConfirmSet(set.id)}
              >
                <Check className="size-3.5" />
              </Button>
            </div>
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => onDeleteSet(set.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full mt-1 h-8 rounded-xl border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all text-[11px] font-bold uppercase tracking-wider"
          onClick={() => onAddSet(ex.id)}
        >
          <Plus className="size-3 mr-1" /> Add Set
        </Button>
      </CardContent>
    </Card>
  );
}
