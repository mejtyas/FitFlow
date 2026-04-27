'use client';

import {
  formatDaysSinceEnded,
  formatPastSetsLine,
  warmupBannerForExercise,
} from '@/app/(dashboard)/dashboard/active/active-workout-format';
import type {
  PastSessionPerformance,
  SessionExercise,
} from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { ChevronDown, Flame, TrendingUp } from 'lucide-react';

function LastTimeLines({ past }: { past: PastSessionPerformance }) {
  return (
    <>
      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-primary/70">
        Last time
      </span>
      <p className="truncate text-xs font-mono font-bold text-primary/90">
        {past.sets.length > 0 ? formatPastSetsLine(past.sets) : '—'}
      </p>
      <p className="truncate text-[10px] font-semibold tabular-nums text-muted-foreground/90">
        {formatDaysSinceEnded(past.endedAt)}
      </p>
    </>
  );
}

export function ActiveWorkoutExercisePastAndWarmup({
  ex,
}: {
  ex: SessionExercise;
}) {
  const w = warmupBannerForExercise(ex);

  return (
    <>
      {ex.past_sessions.length > 0 &&
        (ex.past_sessions.length === 1 ? (
          <div className="mb-4 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-foreground animate-in fade-in zoom-in-95 duration-500">
            <div className="flex min-w-0 items-center gap-2">
              <TrendingUp className="size-3 shrink-0 text-primary" />
              <div className="min-w-0">
                <LastTimeLines past={ex.past_sessions[0]} />
              </div>
            </div>
          </div>
        ) : (
          <details className="group mb-4 rounded-xl border border-primary/10 bg-primary/5 text-foreground animate-in fade-in zoom-in-95 duration-500 open:pb-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <TrendingUp className="size-3 shrink-0 text-primary" />
                <div className="min-w-0">
                  <LastTimeLines past={ex.past_sessions[0]} />
                </div>
              </div>
              <ChevronDown className="size-4 shrink-0 text-primary/50 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="space-y-2 border-t border-primary/10 px-3 pb-2 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Earlier (newest first)
              </p>
              <ul className="space-y-1.5">
                {ex.past_sessions.slice(1).map((past) => (
                  <li
                    key={past.sessionId}
                    className="rounded-md border border-muted/50 bg-background/60 px-2.5 py-1.5"
                  >
                    <p className="text-xs font-mono font-bold text-primary/90">
                      {past.sets.length > 0
                        ? formatPastSetsLine(past.sets)
                        : '—'}
                    </p>
                    <p className="text-[10px] font-semibold tabular-nums text-muted-foreground/90">
                      {formatDaysSinceEnded(past.endedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      {w ? (
        <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 text-foreground dark:bg-amber-500/[0.09]">
          <div className="flex min-w-0 items-start gap-2">
            <Flame
              className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            <div className="min-w-0 space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-800/80 dark:text-amber-300/90">
                Warm-up (from top {w.topKg} kg)
              </span>
              <p className="text-xs font-mono font-bold text-amber-950/90 dark:text-amber-50/95">
                {w.pair.w1.kg} kg × {w.pair.w1.reps}
                <span className="mx-1.5 text-muted-foreground font-sans font-semibold">
                  ·
                </span>
                {w.pair.w2.kg} kg × {w.pair.w2.reps}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground">
                {ex.warmup_settings.w1_pct_low}–{ex.warmup_settings.w1_pct_high}%
                × {ex.warmup_settings.w1_reps}, then {ex.warmup_settings.w2_pct}%
                × {ex.warmup_settings.w2_reps} of top
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
