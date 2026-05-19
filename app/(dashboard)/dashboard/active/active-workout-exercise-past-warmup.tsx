'use client';

import {
  formatDaysSinceEnded,
  formatPastSetsLine,
  warmupBannerForExercise,
} from '@/app/(dashboard)/dashboard/active/active-workout-format';
import type { SessionExercise } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { FileText, Flame, RotateCcw } from 'lucide-react';

export function ActiveWorkoutExercisePastAndWarmup({
  ex,
  onEditNote,
}: {
  ex: SessionExercise;
  onEditNote?: () => void;
}) {
  const w = warmupBannerForExercise(ex);
  const last = ex.past_sessions[0];

  return (
    <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-4">
      {w ? (
        <div className="inline-flex items-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs text-primary">
          <Flame className="size-3.5 shrink-0" aria-hidden />
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em]">
            Warm-up
          </span>
          <span className="font-mono font-medium">
            {w.pair.w1.kg}×{w.pair.w1.reps} · {w.pair.w2.kg}×{w.pair.w2.reps}
          </span>
        </div>
      ) : null}
      {last ? (
        <div className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <RotateCcw className="size-3.5 shrink-0" aria-hidden />
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em]">
            {formatDaysSinceEnded(last.endedAt)}
          </span>
          <span className="truncate font-mono font-medium text-foreground">
            {last.sets.length > 0 ? formatPastSetsLine(last.sets) : '—'}
          </span>
        </div>
      ) : null}
      <button
        type="button"
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
        onClick={onEditNote}
      >
        <FileText className="size-3.5 shrink-0" aria-hidden />
        {ex.exercise_description ? 'Edit note' : 'Add note'}
      </button>
    </div>
  );
}
