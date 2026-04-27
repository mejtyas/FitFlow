'use client';

import {
  REST_DEFAULT_SECONDS,
} from '@/app/(dashboard)/dashboard/active/active-workout-constants';
import {
  formatDuration,
  formatSecondsAsClock,
} from '@/app/(dashboard)/dashboard/active/active-workout-format';
import { Button } from '@/components/ui/button';
import type {
  RestTimerClientState,
  RestTimerOp,
} from '@/lib/workout-session/session-rest-timer';
import { Pause, Play, RotateCcw, StopCircle, X } from 'lucide-react';
import type { RefObject } from 'react';

type ActiveWorkoutStickyBarProps = {
  workoutName: string;
  elapsedMs: number;
  setsDoneCount: number;
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

export function ActiveWorkoutStickyBar({
  workoutName,
  elapsedMs,
  setsDoneCount,
  ending,
  onEnd,
  restAlarmFlash,
  restTargetMs,
  restRemainingMs,
  restPaused,
  startRestCountdown,
  syncRestTimer,
  applyServerRestState,
  alarmConsumedRef,
  setRestAlarmFlash,
}: ActiveWorkoutStickyBarProps) {
  return (
    <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-xl pt-4 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-transparent data-[stuck]:border-border transition-all space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold tracking-tight text-primary">
            {workoutName}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground/60 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              <p className="text-xs font-bold tabular-nums tracking-tighter">
                {formatDuration(elapsedMs)}
              </p>
            </div>
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <p className="text-xs font-bold tabular-nums tracking-tighter">
              <span className="text-muted-foreground/90">{setsDoneCount}</span>
              <span className="font-semibold text-muted-foreground/55">
                {' '}
                {setsDoneCount === 1 ? 'set done' : 'sets done'}
              </span>
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={onEnd}
          disabled={ending}
          size="sm"
          className="rounded-xl font-bold px-5 shadow-lg shadow-destructive/20 h-8 group"
        >
          <StopCircle className="size-4 group-hover:scale-110 transition-transform" />
          End Session
        </Button>
      </div>
      <div
        className={`flex flex-col gap-2 rounded-2xl px-4 py-2 w-fit max-w-full transition-colors duration-300 ${
          restAlarmFlash
            ? 'bg-destructive/25 text-destructive animate-pulse ring-2 ring-destructive/40'
            : restTargetMs !== null
              ? 'bg-primary/10 text-primary'
              : 'bg-muted/50 text-muted-foreground'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-base font-black tabular-nums whitespace-nowrap">
            Rest:{' '}
            {restTargetMs !== null ? formatDuration(restRemainingMs) : '—'}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 hidden sm:inline">
            {restTargetMs === null
              ? `Play uses ${formatSecondsAsClock(REST_DEFAULT_SECONDS)}`
              : restPaused
                ? 'Paused'
                : 'Running'}
          </span>
          {restTargetMs === null ? (
            <button
              type="button"
              className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors text-primary shrink-0"
              aria-label={`Start rest timer (${formatSecondsAsClock(REST_DEFAULT_SECONDS)})`}
              onClick={() => {
                void startRestCountdown(REST_DEFAULT_SECONDS);
              }}
            >
              <Play className="size-4.5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors shrink-0"
                aria-label={
                  restPaused ? 'Resume rest timer' : 'Pause rest timer'
                }
                onClick={() => {
                  void syncRestTimer({
                    kind: restPaused ? 'resume' : 'pause',
                  }).then((r) => {
                    if (r.state && !r.error) {
                      applyServerRestState(r.state);
                    }
                  });
                }}
              >
                {restPaused ? (
                  <Play className="size-4.5" />
                ) : (
                  <Pause className="size-4.5" />
                )}
              </button>
              <button
                type="button"
                className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors shrink-0"
                aria-label="Restart rest timer"
                onClick={() => {
                  if (restTargetMs === null || restTargetMs === undefined) {
                    return;
                  }
                  alarmConsumedRef.current = false;
                  setRestAlarmFlash(false);
                  void syncRestTimer({ kind: 'restart' }).then((r) => {
                    if (r.state && !r.error) {
                      applyServerRestState(r.state);
                    }
                  });
                }}
              >
                <RotateCcw className="size-4.5" />
              </button>
              <button
                type="button"
                className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors shrink-0"
                aria-label="Stop rest timer"
                onClick={() => {
                  alarmConsumedRef.current = false;
                  setRestAlarmFlash(false);
                  void syncRestTimer({ kind: 'stop' }).then((r) => {
                    if (r.state && !r.error) {
                      applyServerRestState(r.state);
                    }
                  });
                }}
              >
                <X className="size-4.5" />
              </button>
            </>
          )}
        </div>
        {restTargetMs !== null && (
          <div className="h-1.5 w-full min-w-[12rem] max-w-xs rounded-full bg-muted/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{
                width:
                  restTargetMs > 0
                    ? `${Math.min(
                        100,
                        Math.round((restRemainingMs / restTargetMs) * 100)
                      )}%`
                    : '0%',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
