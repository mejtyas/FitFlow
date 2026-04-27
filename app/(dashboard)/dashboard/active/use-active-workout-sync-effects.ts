'use client';

import type {
  ActiveWorkoutViewProps,
  SetRow,
} from '@/app/(dashboard)/dashboard/active/active-workout-types';
import type { ActiveWorkoutBase } from '@/app/(dashboard)/dashboard/active/use-active-workout-base';
import {
  activeSessionMirrorKey,
  readMirror,
  patchRestMirrorFromValues,
  type MirrorPayload,
} from '@/app/(dashboard)/dashboard/active/active-workout-mirror';
import {
  mergeMirrorIntoExercises,
  triggerRestCompleteUiFlash,
} from '@/app/(dashboard)/dashboard/active/active-workout-format';
import { useEffect } from 'react';

export function useActiveWorkoutSyncEffects(
  {
    sessionId,
    sessionExercises,
    startedAt,
    initialRest,
  }: ActiveWorkoutViewProps,
  base: ActiveWorkoutBase
) {
  const {
    setExercises,
    latestSetSnapshotRef,
    skipRestMirrorWriteRef,
    setRestDurations,
    restTargetMs,
    restRemainingMs,
    restPaused,
    restEndsAtIso,
    syncRestTimer,
    applyServerRestState,
    setRestTargetMs,
    setRestRemainingMs,
    setRestPaused,
    setRestEndsAtIso,
    setElapsed,
    setRestAlarmFlash,
    alarmConsumedRef,
    restPickerOpen,
    setRestPickerOpen,
    restDurations,
  } = base;

  useEffect(() => {
    setExercises((prev) => {
      const prevById = prev
        .flatMap((ex) => ex.sets)
        .reduce((acc, s) => acc.set(s.id, s), new Map<string, SetRow>());
      return sessionExercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => {
          const local = prevById.get(s.id);
          return local
            ? {
                ...s,
                kg: local.kg,
                reps: local.reps,
                completed: local.completed,
              }
            : s;
        }),
      }));
    });
  }, [sessionExercises, setExercises]);

  useEffect(() => {
    skipRestMirrorWriteRef.current = true;
  }, [sessionId, skipRestMirrorWriteRef]);

  useEffect(() => {
    const mirror = readMirror(sessionId);

    const hasSets = mirror && Object.keys(mirror.sets).length > 0;
    if (hasSets && mirror) {
      setExercises((prev) => mergeMirrorIntoExercises(prev, mirror.sets));

      Object.entries(mirror.sets).map(([id, vals]) =>
        latestSetSnapshotRef.current.set(id, {
          kg: vals.kg,
          reps: vals.reps,
          completed: vals.completed ?? false,
        })
      );

      const updates = Object.entries(mirror.sets)
        .filter(([id]) => !id.startsWith('temp-'))
        .map(([setId, vals]) => ({
          setId,
          kg: vals.kg,
          reps: vals.reps,
          completed: vals.completed ?? false,
        }));

      if (updates.length > 0) {
        void fetch('/api/session-sets/flush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, updates }),
        }).catch(() => {});
      }
    }

    if (mirror?.restDurations && Object.keys(mirror.restDurations).length > 0) {
      setRestDurations((prev) => ({ ...prev, ...mirror.restDurations }));
    }

    skipRestMirrorWriteRef.current = false;
  }, [sessionId, setExercises, latestSetSnapshotRef, skipRestMirrorWriteRef, setRestDurations]);

  useEffect(() => {
    setRestTargetMs(initialRest.targetMs);
    setRestRemainingMs(initialRest.remainingMs);
    setRestPaused(initialRest.paused);
    setRestEndsAtIso(initialRest.endsAtIso);
  }, [
    sessionId,
    initialRest.targetMs,
    initialRest.remainingMs,
    initialRest.paused,
    initialRest.endsAtIso,
    setRestTargetMs,
    setRestRemainingMs,
    setRestPaused,
    setRestEndsAtIso,
  ]);

  useEffect(() => {
    if (skipRestMirrorWriteRef.current) {
      return;
    }
    patchRestMirrorFromValues(
      sessionId,
      restTargetMs,
      restRemainingMs,
      restPaused,
      restEndsAtIso
    );
  }, [
    sessionId,
    restTargetMs,
    restRemainingMs,
    restPaused,
    restEndsAtIso,
    skipRestMirrorWriteRef,
  ]);

  useEffect(() => {
    if (restTargetMs === null) {
      return;
    }
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void syncRestTimer({ kind: 'pull' }).then((r) => {
        if (r.state && !r.error) {
          applyServerRestState(r.state);
        }
      });
    }, 4000);
    return () => clearInterval(id);
  }, [restTargetMs, syncRestTimer, applyServerRestState]);

  useEffect(() => {
    if (skipRestMirrorWriteRef.current) {
      return;
    }
    try {
      const prev = readMirror(sessionId);
      const sets = prev?.sets ?? {};
      if (
        Object.keys(restDurations).length === 0 &&
        Object.keys(sets).length === 0
      ) {
        return;
      }
      const next: MirrorPayload = {
        v: 3,
        sessionId,
        updatedAt: Date.now(),
        sets,
        rest: prev?.rest,
        restDurations,
      };
      localStorage.setItem(
        activeSessionMirrorKey(sessionId),
        JSON.stringify(next)
      );
    } catch {
      /* ignore */
    }
  }, [sessionId, restDurations, skipRestMirrorWriteRef]);

  const startedMs = new Date(startedAt).getTime();

  useEffect(() => {
    if (!restPickerOpen) {
      return;
    }
    const down = (e: MouseEvent) => {
      const el = document.getElementById(`rest-picker-${restPickerOpen}`);
      if (el && !el.contains(e.target as Node)) {
        setRestPickerOpen(null);
      }
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [restPickerOpen, setRestPickerOpen]);

  useEffect(() => {
    const tick = () => {
      setElapsed(Date.now() - startedMs);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedMs, setElapsed]);

  useEffect(() => {
    if (restTargetMs === null || restPaused) {
      return;
    }
    if (!restEndsAtIso) {
      return;
    }

    const tick = () => {
      const ends = new Date(restEndsAtIso).getTime();
      const rem = Math.max(0, Math.ceil(ends - Date.now()));
      setRestRemainingMs(rem);
      if (rem === 0 && !alarmConsumedRef.current) {
        alarmConsumedRef.current = true;
        queueMicrotask(() => {
          triggerRestCompleteUiFlash(setRestAlarmFlash);
          setRestTargetMs(null);
          setRestRemainingMs(0);
          setRestPaused(false);
          setRestEndsAtIso(null);
          void syncRestTimer({ kind: 'stop' });
        });
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [
    restTargetMs,
    restPaused,
    restEndsAtIso,
    syncRestTimer,
    alarmConsumedRef,
    setRestAlarmFlash,
    setRestRemainingMs,
    setRestPaused,
    setRestTargetMs,
    setRestEndsAtIso,
  ]);
}
