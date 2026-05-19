'use client';

import {
  patchRestMirrorFromValues,
} from '@/app/(dashboard)/dashboard/active/active-workout-mirror';
import type { ActiveWorkoutViewProps } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import { SET_SAVE_DEBOUNCE_MS } from '@/app/(dashboard)/dashboard/active/active-workout-constants';
import { triggerRestCompleteUiFlash } from '@/app/(dashboard)/dashboard/active/active-workout-format';
import type {
  RestTimerClientState,
  RestTimerOp,
} from '@/lib/workout-session/session-rest-timer';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { postSessionSetsFlush } from '@/lib/workout-session/post-session-sets-flush-client';

async function flushSetSnapshot(
  sessionId: string,
  setId: string,
  vals: { kg: number | null; reps: number | null; completed: boolean }
) {
  const result = await postSessionSetsFlush(sessionId, [
    {
      setId,
      kg: vals.kg,
      reps: vals.reps,
      completed: vals.completed,
    },
  ]);
  if ('error' in result) {
    console.error('Failed to save set', result.error);
  }
}

export function useActiveWorkoutBase({
  sessionId,
  sessionExercises,
  initialRest,
}: ActiveWorkoutViewProps) {
  const [exercises, setExercises] = useState(sessionExercises);
  const [elapsed, setElapsed] = useState(0);
  const [restTargetMs, setRestTargetMs] = useState<number | null>(
    initialRest.targetMs
  );
  const [restRemainingMs, setRestRemainingMs] = useState(
    initialRest.remainingMs
  );
  const [restPaused, setRestPaused] = useState(initialRest.paused);
  const [restEndsAtIso, setRestEndsAtIso] = useState<string | null>(
    initialRest.endsAtIso
  );
  const [restDurations, setRestDurations] = useState<Record<string, number>>(
    {}
  );
  const [restAlarmFlash, setRestAlarmFlash] = useState(false);
  const [restPickerOpen, setRestPickerOpen] = useState<string | null>(null);
  const [customRestDraft, setCustomRestDraft] = useState('');
  const [ending, setEnding] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState<string | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<
    string | null
  >(null);
  const [editDescriptionValue, setEditDescriptionValue] = useState('');
  const alarmConsumedRef = useRef(false);
  const latestSetSnapshotRef = useRef(
    new Map<
      string,
      { kg: number | null; reps: number | null; completed: boolean }
    >()
  );
  const setSaveDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const restPersistRef = useRef({
    target: null as number | null,
    remaining: 0,
    paused: false,
    endsAtIso: null as string | null,
  });
  const hadRunningRestRef = useRef(false);
  const skipRestMirrorWriteRef = useRef(true);
  const scrollPreserveYRef = useRef<number | null>(null);

  const preserveScrollOnNextLayout = useCallback(() => {
    if (typeof window !== 'undefined') {
      scrollPreserveYRef.current = window.scrollY;
    }
  }, []);

  useLayoutEffect(() => {
    if (scrollPreserveYRef.current !== null) {
      window.scrollTo(0, scrollPreserveYRef.current);
      scrollPreserveYRef.current = null;
    }
  }, [exercises]);

  useLayoutEffect(() => {
    restPersistRef.current = {
      target: restTargetMs,
      remaining: restRemainingMs,
      paused: restPaused,
      endsAtIso: restEndsAtIso,
    };
    hadRunningRestRef.current =
      restTargetMs !== null &&
      !restPaused &&
      restEndsAtIso !== null &&
      restEndsAtIso !== undefined;
  }, [restTargetMs, restRemainingMs, restPaused, restEndsAtIso]);

  const applyServerRestState = useCallback((s: RestTimerClientState) => {
    const wasRunning = hadRunningRestRef.current;
    const nowIdle = s.targetMs === null;

    setRestTargetMs(s.targetMs);
    setRestRemainingMs(s.remainingMs);
    setRestPaused(s.paused);
    setRestEndsAtIso(s.endsAtIso);

    if (wasRunning && nowIdle && !alarmConsumedRef.current) {
      alarmConsumedRef.current = true;
      queueMicrotask(() => {
        triggerRestCompleteUiFlash(setRestAlarmFlash);
      });
    }
  }, []);

  const syncRestTimer = useCallback(
    async (
      op: RestTimerOp
    ): Promise<{ error?: string; state?: RestTimerClientState }> => {
      try {
        const res = await fetch('/api/session-rest-timer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, op }),
        });
        const json = (await res.json()) as {
          error?: string;
          state?: RestTimerClientState;
        };
        if (!res.ok) {
          return { error: json.error ?? `HTTP ${res.status}` };
        }
        return json;
      } catch (err) {
        console.error('Failed to sync rest timer', err);
        return { error: 'Network error' };
      }
    },
    [sessionId]
  );

  const flushSetsKeepalive = useCallback(() => {
    const r = restPersistRef.current;
    patchRestMirrorFromValues(
      sessionId,
      r.target,
      r.remaining,
      r.paused,
      r.endsAtIso
    );

    Array.from(setSaveDebounceRef.current.values()).map((timer) =>
      clearTimeout(timer)
    );
    setSaveDebounceRef.current.clear();

    const entries = Array.from(latestSetSnapshotRef.current.entries()).filter(
      ([id]) => !id.startsWith('temp-')
    );
    if (entries.length === 0) {
      return;
    }

    const updates = entries.map(([setId, vals]) => ({
      setId,
      kg: vals.kg,
      reps: vals.reps,
      completed: vals.completed,
    }));

    void postSessionSetsFlush(sessionId, updates, { keepalive: true }).catch(
      () => {}
    );
  }, [sessionId]);

  const persistSetNow = useCallback(
    (setId: string) => {
      if (setId.startsWith('temp-')) {
        return;
      }
      const prevTimer = setSaveDebounceRef.current.get(setId);
      if (prevTimer) {
        clearTimeout(prevTimer);
      }
      setSaveDebounceRef.current.delete(setId);
      const vals = latestSetSnapshotRef.current.get(setId);
      if (!vals) {
        return;
      }
      void flushSetSnapshot(sessionId, setId, vals);
    },
    [sessionId]
  );

  const schedulePersistSet = useCallback(
    (setId: string) => {
      const prevTimer = setSaveDebounceRef.current.get(setId);
      if (prevTimer) {
        clearTimeout(prevTimer);
      }
      const t = setTimeout(() => {
        setSaveDebounceRef.current.delete(setId);
        const vals = latestSetSnapshotRef.current.get(setId);
        if (!vals) {
          return;
        }
        void flushSetSnapshot(sessionId, setId, vals);
      }, SET_SAVE_DEBOUNCE_MS);
      setSaveDebounceRef.current.set(setId, t);
    },
    [sessionId]
  );

  useEffect(() => {
    const debounceTimersRef = setSaveDebounceRef;
    const snapshotsRef = latestSetSnapshotRef;
    return () => {
      Array.from(debounceTimersRef.current.entries()).map(([setId, timer]) => {
        clearTimeout(timer);
        const vals = snapshotsRef.current.get(setId);
        if (vals) {
          void flushSetSnapshot(sessionId, setId, vals).catch(() => {});
        }
      });
      debounceTimersRef.current.clear();
    };
  }, [sessionId]);

  useEffect(() => {
    const onPageHide = () => flushSetsKeepalive();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushSetsKeepalive();
        return;
      }
      void syncRestTimer({ kind: 'pull' }).then((r) => {
        if (r.state && !r.error) {
          applyServerRestState(r.state);
        }
      });
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushSetsKeepalive, syncRestTimer, applyServerRestState]);

  return {
    exercises,
    setExercises,
    elapsed,
    setElapsed,
    restTargetMs,
    setRestTargetMs,
    restRemainingMs,
    setRestRemainingMs,
    restPaused,
    setRestPaused,
    restEndsAtIso,
    setRestEndsAtIso,
    restDurations,
    setRestDurations,
    restAlarmFlash,
    setRestAlarmFlash,
    restPickerOpen,
    setRestPickerOpen,
    customRestDraft,
    setCustomRestDraft,
    ending,
    setEnding,
    addExerciseOpen,
    setAddExerciseOpen,
    editingDescriptionId,
    setEditingDescriptionId,
    editDescriptionValue,
    setEditDescriptionValue,
    alarmConsumedRef,
    latestSetSnapshotRef,
    setSaveDebounceRef,
    restPersistRef,
    hadRunningRestRef,
    skipRestMirrorWriteRef,
    applyServerRestState,
    syncRestTimer,
    flushSetsKeepalive,
    persistSetNow,
    schedulePersistSet,
    preserveScrollOnNextLayout,
  };
}

export type ActiveWorkoutBase = ReturnType<typeof useActiveWorkoutBase>;
