'use client';

import { getDefaultRestSeconds } from '@/lib/rest-preferences';
import {
  formatDuration,
} from '@/app/(dashboard)/dashboard/active/active-workout-format';
import { Button } from '@/components/ui/button';
import type {
  RestTimerClientState,
  RestTimerOp,
} from '@/lib/workout-session/session-rest-timer';
import { Check, Pause, Play, StopCircle } from 'lucide-react';
import type { RefObject } from 'react';

type ActiveWorkoutStickyBarProps = {
  workoutName: string;
  elapsedMs: number;
  setsDoneCount: number;
  totalSetsCount: number;
  volumeKg: number;
  currentExerciseLabel: string;
  ending: boolean;
  onEnd: () => void;
  restAlarmFlash: boolean;
  restTargetMs: number | null;
  restRemainingMs: number;
  restPaused: boolean;
  startRestCountdown: (seconds: number) => Promise<void>;
  syncRestTimer: (
    op: RestTimerOp
  ) => Promise<{ error?: string; state?: RestTimerClientState }>;
  applyServerRestState: (s: RestTimerClientState) => void;
  alarmConsumedRef: RefObject<boolean | null>;
  setRestAlarmFlash: (v: boolean) => void;
};

export function ActiveWorkoutRestDock({
  restAlarmFlash,
  restTargetMs,
  restRemainingMs,
  restPaused,
  startRestCountdown,
  syncRestTimer,
  applyServerRestState,
  alarmConsumedRef,
  setRestAlarmFlash,
}: Pick<
  ActiveWorkoutStickyBarProps,
  | 'restAlarmFlash'
  | 'restTargetMs'
  | 'restRemainingMs'
  | 'restPaused'
  | 'startRestCountdown'
  | 'syncRestTimer'
  | 'applyServerRestState'
  | 'alarmConsumedRef'
  | 'setRestAlarmFlash'
>) {
  const progress =
    restTargetMs !== null && restTargetMs > 0
      ? Math.min(100, Math.round((restRemainingMs / restTargetMs) * 100))
      : 0;
  const toggleRest = () => {
    if (restTargetMs === null) {
      void startRestCountdown(getDefaultRestSeconds());
      return;
    }
    void syncRestTimer({ kind: restPaused ? 'resume' : 'pause' }).then((r) => {
      if (r.state && !r.error) {
        applyServerRestState(r.state);
      }
    });
  };
  const stopRest = () => {
    alarmConsumedRef.current = false;
    setRestAlarmFlash(false);
    void syncRestTimer({ kind: 'stop' }).then((r) => {
      if (r.state && !r.error) {
        applyServerRestState(r.state);
      }
    });
  };

  return (
    <div
      className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/95 py-2 pl-3 pr-2 shadow-2xl shadow-black/40 backdrop-blur-xl transition-colors duration-300 ${
        restAlarmFlash ? 'ring-2 ring-destructive/50' : ''
      }`}
    >
      <div
        className="grid size-10 place-items-center rounded-full bg-[conic-gradient(var(--primary)_calc(var(--p)*1%),var(--border)_0)]"
        style={{ '--p': progress } as React.CSSProperties}
      >
        <div className="grid size-8 place-items-center rounded-full bg-card text-primary">
          <StopCircle className="size-3.5" aria-hidden />
        </div>
      </div>
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          Resting
        </p>
        <p className="min-w-16 font-mono text-[1.375rem] font-medium leading-none tracking-tight">
          {restTargetMs !== null ? formatDuration(restRemainingMs) : '0:00'}
        </p>
      </div>
      <div className="ml-1 flex items-center gap-1 border-l border-border pl-2">
        <button
          type="button"
          className="grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
          aria-label="Pause or resume rest timer"
          onClick={toggleRest}
        >
          {restTargetMs === null || restPaused ? (
            <Play className="size-4" aria-hidden />
          ) : (
            <Pause className="size-4" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="grid size-9 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:scale-105"
          aria-label="Stop rest timer"
          onClick={stopRest}
        >
          <Check className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function ActiveWorkoutStickyBar({
  workoutName,
  elapsedMs,
  setsDoneCount,
  totalSetsCount,
  volumeKg,
  currentExerciseLabel,
  ending,
  onEnd,
}: ActiveWorkoutStickyBarProps) {
  const progress =
    totalSetsCount > 0 ? Math.round((setsDoneCount / totalSetsCount) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-lg shadow-black/10">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-5">
          <div className="min-w-36">
            <p className="mb-1 flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary">
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_0_4px_var(--accent)]" />
              In session
            </p>
            <h1 className="truncate text-2xl font-semibold leading-none tracking-tight">
              {workoutName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-5 border-border lg:border-l lg:pl-5">
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Elapsed
              </p>
              <p className="mt-1 font-mono text-lg font-medium leading-none">
                {formatDuration(elapsedMs)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Sets done
              </p>
              <p className="mt-1 font-mono text-lg font-medium leading-none">
                {setsDoneCount}
                <span className="ml-1 text-xs text-muted-foreground">
                  / {totalSetsCount}
                </span>
              </p>
            </div>
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Volume
              </p>
              <p className="mt-1 font-mono text-lg font-medium leading-none">
                {volumeKg.toLocaleString()}
                <span className="ml-1 text-xs text-muted-foreground">kg</span>
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={onEnd}
          disabled={ending}
          size="sm"
          className="cursor-pointer rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary motion-reduce:hover:translate-y-0"
        >
          Finish workout
          <Check className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <p className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="font-semibold text-foreground">{progress}%</span> ·{' '}
          {setsDoneCount} of {totalSetsCount} sets
        </p>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="hidden truncate whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground md:block">
          {currentExerciseLabel}
        </p>
      </div>
    </div>
  );
}
