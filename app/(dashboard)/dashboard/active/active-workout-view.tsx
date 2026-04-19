"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { endWorkout, addSetToSessionExercise, updateSet, deleteSet, addExerciseToSession } from "@/app/actions/workout-session";
import { updateExerciseDescription } from "@/app/actions/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, StopCircle, Trash2, TrendingUp, Check, Pause, Play, RotateCcw, X, ChevronDown, Clock } from "lucide-react";

/** Default rest between sets: 2m 30s */
const REST_DEFAULT_SECONDS = 150;

/** Debounce persistence of kg/reps — rapid Server Action calls trigger Next.js 16 flight errors */
const SET_SAVE_DEBOUNCE_MS = 400;

const ACTIVE_SESSION_LS_PREFIX = "fitflow:activeSession:";

function activeSessionMirrorKey(sessionId: string): string {
  return `${ACTIVE_SESSION_LS_PREFIX}${sessionId}`;
}

/** Persisted rest countdown (v2 mirror); running uses wall-clock endAt so remaining survives refresh */
type RestMirrorPersist =
  | {
      targetMs: number;
      paused: boolean;
      /** When running: unix ms when countdown hits 0; unused when paused */
      endAt: number;
      remainingMsPaused?: number;
    }
  | null;

type MirrorPayload = {
  v: 1 | 2;
  sessionId: string;
  updatedAt: number;
  sets: Record<string, { kg: number | null; reps: number | null }>;
  rest?: RestMirrorPersist;
};

function readMirror(sessionId: string): MirrorPayload | null {
  try {
    const raw = localStorage.getItem(activeSessionMirrorKey(sessionId));
    if (!raw) return null;
    const p = JSON.parse(raw) as MirrorPayload;
    if (p.v !== 1 && p.v !== 2) return null;
    if (p.sessionId !== sessionId || !p.sets) return null;
    return p;
  } catch {
    return null;
  }
}

function patchRestMirrorFromValues(
  sessionId: string,
  target: number | null,
  remaining: number,
  paused: boolean
): void {
  try {
    const prev = readMirror(sessionId);
    const sets = prev?.sets ?? {};
    let rest: RestMirrorPersist;
    if (target == null) {
      rest = null;
    } else if (paused) {
      rest = {
        targetMs: target,
        paused: true,
        endAt: 0,
        remainingMsPaused: remaining,
      };
    } else {
      rest = {
        targetMs: target,
        paused: false,
        endAt: Date.now() + remaining,
      };
    }
    const next: MirrorPayload = {
      v: 2,
      sessionId,
      updatedAt: Date.now(),
      sets,
      rest,
    };
    if (rest === null && Object.keys(sets).length === 0) {
      localStorage.removeItem(activeSessionMirrorKey(sessionId));
    } else {
      localStorage.setItem(
        activeSessionMirrorKey(sessionId),
        JSON.stringify(next)
      );
    }
  } catch {
    /* ignore */
  }
}

function writeMirrorPatch(
  sessionId: string,
  setId: string,
  kg: number | null,
  reps: number | null
): void {
  try {
    const prev = readMirror(sessionId);
    const sets = { ...(prev?.sets ?? {}) };
    sets[setId] = { kg, reps };
    const next: MirrorPayload = {
      v: 2,
      sessionId,
      updatedAt: Date.now(),
      sets,
      rest: prev?.rest,
    };
    localStorage.setItem(activeSessionMirrorKey(sessionId), JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

function removeMirrorSet(sessionId: string, setId: string): void {
  try {
    const m = readMirror(sessionId);
    if (!m?.sets || !(setId in m.sets)) return;
    const sets = { ...m.sets };
    delete sets[setId];
    if (Object.keys(sets).length === 0) {
      if (m.rest?.targetMs) {
        localStorage.setItem(
          activeSessionMirrorKey(sessionId),
          JSON.stringify({
            ...m,
            v: 2 as const,
            sets: {},
            updatedAt: Date.now(),
          })
        );
        return;
      }
      localStorage.removeItem(activeSessionMirrorKey(sessionId));
      return;
    }
    localStorage.setItem(
      activeSessionMirrorKey(sessionId),
      JSON.stringify({ ...m, v: 2 as const, sets, updatedAt: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

function clearMirror(sessionId: string): void {
  try {
    localStorage.removeItem(activeSessionMirrorKey(sessionId));
  } catch {
    /* ignore */
  }
}

function migrateMirrorSetId(
  sessionId: string,
  fromId: string,
  toId: string
): void {
  try {
    const m = readMirror(sessionId);
    if (!m?.sets[fromId]) return;
    const sets = { ...m.sets };
    sets[toId] = sets[fromId];
    delete sets[fromId];
    localStorage.setItem(
      activeSessionMirrorKey(sessionId),
      JSON.stringify({
        ...m,
        v: 2 as const,
        sets,
        updatedAt: Date.now(),
      })
    );
  } catch {
    /* ignore */
  }
}

const REST_PRESET_SECONDS = [60, 90, 120, 150, 180, 300] as const;

function formatSecondsAsClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function playRestCompleteBeep() {
  try {
    const AudioCtx =
      typeof window !== "undefined"
        ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    /* ignore */
  }
}

type SetRow = { id: string; set_index: number; kg: number | null; reps: number | null };

type PastSessionPerformance = {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  workoutName: string;
  sets: { kg: number | null; reps: number | null }[];
};

type SessionExercise = {
  id: string;
  order_index: number;
  exercise_id: string;
  exercise_name: string;
  exercise_description: string | null;
  sets: SetRow[];
  past_sessions: PastSessionPerformance[];
};
type ExerciseOption = { id: string; name: string; description: string | null };

function mergeMirrorIntoExercises(
  exercises: SessionExercise[],
  mirrorSets: Record<string, { kg: number | null; reps: number | null }>
): SessionExercise[] {
  return exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => {
      const m = mirrorSets[s.id];
      if (!m) return s;
      return { ...s, kg: m.kg, reps: m.reps };
    }),
  }));
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPastSetsLine(sets: { kg: number | null; reps: number | null }[]): string {
  return sets.map((s) => `${s.kg ?? 0}×${s.reps ?? 0}`).join(", ");
}

export function ActiveWorkoutView({
  sessionId,
  startedAt,
  workoutName,
  sessionExercises,
  availableExercises,
}: {
  sessionId: string;
  startedAt: string;
  workoutName: string;
  sessionExercises: SessionExercise[];
  availableExercises: ExerciseOption[];
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(sessionExercises);
  const [elapsed, setElapsed] = useState(0);
  /** null = rest timer idle / finished */
  const [restTargetMs, setRestTargetMs] = useState<number | null>(null);
  const [restRemainingMs, setRestRemainingMs] = useState(0);
  const [restPaused, setRestPaused] = useState(false);
  const [confirmedSets, setConfirmedSets] = useState<Set<string>>(new Set());
  /** Per exercise_library id → rest duration in seconds (default REST_DEFAULT_SECONDS when unset) */
  const [restDurations, setRestDurations] = useState<Record<string, number>>({});
  const [restAlarmFlash, setRestAlarmFlash] = useState(false);
  const [restPickerOpen, setRestPickerOpen] = useState<string | null>(null);
  const [customRestDraft, setCustomRestDraft] = useState("");
  const [ending, setEnding] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState<string | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [editDescriptionValue, setEditDescriptionValue] = useState("");
  const timerTriggeredSetsRef = useRef<Set<string>>(new Set());
  const alarmConsumedRef = useRef(false);
  const latestSetSnapshotRef = useRef(
    new Map<string, { kg: number | null; reps: number | null }>()
  );
  const setSaveDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  /** Latest rest timer for keepalive flush; avoids stale timer in event listeners */
  const restPersistRef = useRef({
    target: null as number | null,
    remaining: 0,
    paused: false,
  });
  /** Skip mirroring rest to localStorage until initial hydrate from storage has run */
  const skipRestMirrorWriteRef = useRef(true);

  useLayoutEffect(() => {
    restPersistRef.current = {
      target: restTargetMs,
      remaining: restRemainingMs,
      paused: restPaused,
    };
  }, [restTargetMs, restRemainingMs, restPaused]);

  const flushSetsKeepalive = useCallback(() => {
    const r = restPersistRef.current;
    patchRestMirrorFromValues(sessionId, r.target, r.remaining, r.paused);

    for (const [, timer] of setSaveDebounceRef.current) {
      clearTimeout(timer);
    }
    setSaveDebounceRef.current.clear();

    const entries = Array.from(latestSetSnapshotRef.current.entries()).filter(
      ([id]) => !id.startsWith("temp-")
    );
    if (entries.length === 0) return;

    const updates = entries.map(([setId, vals]) => ({
      setId,
      kg: vals.kg,
      reps: vals.reps,
    }));

    fetch("/api/session-sets/flush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, updates }),
      keepalive: true,
    }).catch(() => {});
  }, [sessionId]);

  const persistSetNow = useCallback(
    (setId: string) => {
      if (setId.startsWith("temp-")) return;
      const prevTimer = setSaveDebounceRef.current.get(setId);
      if (prevTimer) clearTimeout(prevTimer);
      setSaveDebounceRef.current.delete(setId);
      const vals = latestSetSnapshotRef.current.get(setId);
      if (!vals) return;
      void updateSet(sessionId, setId, { kg: vals.kg, reps: vals.reps }).catch(
        (err) => {
          console.error("Failed to save set", err);
        }
      );
    },
    [sessionId]
  );

  const schedulePersistSet = useCallback(
    (setId: string) => {
      const prevTimer = setSaveDebounceRef.current.get(setId);
      if (prevTimer) clearTimeout(prevTimer);
      const t = setTimeout(() => {
        setSaveDebounceRef.current.delete(setId);
        const vals = latestSetSnapshotRef.current.get(setId);
        if (!vals) return;
        void updateSet(sessionId, setId, {
          kg: vals.kg,
          reps: vals.reps,
        }).catch((err) => {
          console.error("Failed to save set", err);
        });
      }, SET_SAVE_DEBOUNCE_MS);
      setSaveDebounceRef.current.set(setId, t);
    },
    [sessionId]
  );

  useEffect(() => {
    const debounceTimersRef = setSaveDebounceRef;
    const snapshotsRef = latestSetSnapshotRef;
    return () => {
      for (const [setId, timer] of debounceTimersRef.current) {
        clearTimeout(timer);
        const vals = snapshotsRef.current.get(setId);
        if (vals) {
          void updateSet(sessionId, setId, {
            kg: vals.kg,
            reps: vals.reps,
          }).catch(() => {});
        }
      }
      debounceTimersRef.current.clear();
    };
  }, [sessionId]);

  useEffect(() => {
    const onPageHide = () => flushSetsKeepalive();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSetsKeepalive();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flushSetsKeepalive]);

  useEffect(() => {
    // Only sync structural changes (added/removed exercises or sets) from server,
    // but preserve local kg/reps values to avoid overwriting user input
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prop→state merge for optimistic typing */
    setExercises((prev) => {
      const prevById = new Map<string, SetRow>();
      for (const ex of prev) {
        for (const s of ex.sets) {
          prevById.set(s.id, s);
        }
      }
      return sessionExercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => {
          const local = prevById.get(s.id);
          return local ? { ...s, kg: local.kg, reps: local.reps } : s;
        }),
      }));
    });
  }, [sessionExercises]);

  useEffect(() => {
    skipRestMirrorWriteRef.current = true;
  }, [sessionId]);

  useEffect(() => {
    const mirror = readMirror(sessionId);

    const hasSets = mirror && Object.keys(mirror.sets).length > 0;
    if (hasSets && mirror) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate local mirror after reload/crash */
      setExercises((prev) => mergeMirrorIntoExercises(prev, mirror.sets));

      for (const [id, vals] of Object.entries(mirror.sets)) {
        latestSetSnapshotRef.current.set(id, vals);
      }

      const updates = Object.entries(mirror.sets)
        .filter(([id]) => !id.startsWith("temp-"))
        .map(([setId, vals]) => ({
          setId,
          kg: vals.kg,
          reps: vals.reps,
        }));

      if (updates.length > 0) {
        void fetch("/api/session-sets/flush", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, updates }),
        }).catch(() => {});
      }
    }

    const rest = mirror?.rest;
    if (rest?.targetMs) {
      alarmConsumedRef.current = false;
      setRestAlarmFlash(false);
      if (rest.paused && rest.remainingMsPaused != null) {
        setRestTargetMs(rest.targetMs);
        setRestRemainingMs(rest.remainingMsPaused);
        setRestPaused(true);
      } else if (!rest.paused && rest.endAt > 0) {
        const remaining = Math.max(0, rest.endAt - Date.now());
        if (remaining <= 0) {
          setRestTargetMs(null);
          setRestRemainingMs(0);
          setRestPaused(false);
          patchRestMirrorFromValues(sessionId, null, 0, false);
        } else {
          setRestTargetMs(rest.targetMs);
          setRestRemainingMs(remaining);
          setRestPaused(false);
        }
      }
    }

    skipRestMirrorWriteRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (skipRestMirrorWriteRef.current) return;
    patchRestMirrorFromValues(
      sessionId,
      restTargetMs,
      restRemainingMs,
      restPaused
    );
  }, [sessionId, restTargetMs, restRemainingMs, restPaused]);

  const startedMs = new Date(startedAt).getTime();

  useEffect(() => {
    if (!restPickerOpen) return;
    const down = (e: MouseEvent) => {
      const el = document.getElementById(`rest-picker-${restPickerOpen}`);
      if (el && !el.contains(e.target as Node)) setRestPickerOpen(null);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [restPickerOpen]);

  useEffect(() => {
    const tick = () => {
      setElapsed(Date.now() - startedMs);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedMs]);

  useEffect(() => {
    if (restTargetMs === null || restPaused) return;
    const interval = setInterval(() => {
      setRestRemainingMs((prev) => {
        const next = Math.max(0, prev - 1000);
        if (prev > 0 && next === 0 && !alarmConsumedRef.current) {
          alarmConsumedRef.current = true;
          queueMicrotask(() => {
            playRestCompleteBeep();
            if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
              navigator.vibrate(200);
            }
            setRestAlarmFlash(true);
            window.setTimeout(() => setRestAlarmFlash(false), 2200);
            setRestTargetMs(null);
            setRestPaused(false);
          });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restTargetMs, restPaused]);

  const startRestCountdown = useCallback((durationSeconds: number) => {
    const ms = Math.max(1000, durationSeconds * 1000);
    alarmConsumedRef.current = false;
    setRestAlarmFlash(false);
    setRestTargetMs(ms);
    setRestRemainingMs(ms);
    setRestPaused(false);
  }, []);

  const handleConfirmSet = useCallback((setId: string) => {
    setConfirmedSets((prev) => new Set(prev).add(setId));
  }, []);

  const handleEnd = useCallback(async () => {
    setEnding(true);
    const result = await endWorkout(sessionId);
    if ("error" in result && result.error) {
      setEnding(false);
      return;
    }
    clearMirror(sessionId);
    router.push("/dashboard");
    router.refresh();
  }, [sessionId, router]);

  const handleAddSet = useCallback(async (sessionExerciseId: string) => {
    // Optimistic: append a placeholder set immediately
    const tempId = `temp-${Date.now()}`;
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === sessionExerciseId
          ? { ...ex, sets: [...ex.sets, { id: tempId, set_index: (ex.sets.length > 0 ? Math.max(...ex.sets.map(s => s.set_index)) + 1 : 0), kg: null, reps: null }] }
          : ex
      )
    );

    const result = await addSetToSessionExercise(sessionExerciseId);
    if (result.error) {
      // Rollback on failure
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === sessionExerciseId
            ? { ...ex, sets: ex.sets.filter((s) => s.id !== tempId) }
            : ex
        )
      );
      return;
    }

    // Replace temp ID with real server ID (keep any kg/reps typed while the request was in flight)
    if (result.set) {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === sessionExerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === tempId
                    ? { ...result.set!, kg: s.kg, reps: s.reps }
                    : s
                ),
              }
            : ex
        )
      );
      const snap = latestSetSnapshotRef.current.get(tempId);
      const tmr = setSaveDebounceRef.current.get(tempId);
      if (tmr) {
        clearTimeout(tmr);
        setSaveDebounceRef.current.delete(tempId);
      }
      latestSetSnapshotRef.current.delete(tempId);
      if (snap && (snap.kg != null || snap.reps != null)) {
        latestSetSnapshotRef.current.set(result.set.id, snap);
        migrateMirrorSetId(sessionId, tempId, result.set.id);
        schedulePersistSet(result.set.id);
      }
    }
  }, [schedulePersistSet, sessionId]);

  const handleSetChange = useCallback(
    (setId: string, exerciseId: string, field: "kg" | "reps", value: number | "") => {
      let num: number | null = null;
      if (value !== "") {
        const n = typeof value === "number" ? value : Number(value);
        num = Number.isFinite(n) ? n : null;
      }
      setExercises((prev) => {
        const next = prev.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) =>
            s.id === setId ? { ...s, [field]: num } : s
          ),
        }));

        const containing = next.find((ex) => ex.sets.some((s) => s.id === setId));
        const updated = containing?.sets.find((s) => s.id === setId);
        if (updated) {
          latestSetSnapshotRef.current.set(setId, {
            kg: updated.kg,
            reps: updated.reps,
          });
          writeMirrorPatch(
            sessionId,
            setId,
            updated.kg,
            updated.reps
          );
        }
        if (
          updated &&
          updated.kg != null &&
          updated.reps != null &&
          !timerTriggeredSetsRef.current.has(setId)
        ) {
          timerTriggeredSetsRef.current.add(setId);
          const sec = restDurations[exerciseId] ?? REST_DEFAULT_SECONDS;
          queueMicrotask(() => {
            startRestCountdown(sec);
            setConfirmedSets((prevSets) => new Set(prevSets).add(setId));
          });
        }

        return next;
      });
      if (!setId.startsWith("temp-")) {
        schedulePersistSet(setId);
      }
    },
    [restDurations, schedulePersistSet, sessionId, startRestCountdown]
  );
  
  const handleDeleteSet = useCallback(async (setId: string) => {
    let wasConfirmed = false;
    let snapshot: SessionExercise[] = [];
    setConfirmedSets((prev) => {
      wasConfirmed = prev.has(setId);
      const next = new Set(prev);
      next.delete(setId);
      return next;
    });
    setExercises((prev) => {
      snapshot = prev;
      return prev.map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.id !== setId),
      }));
    });

    timerTriggeredSetsRef.current.delete(setId);

    const pendingSave = setSaveDebounceRef.current.get(setId);
    if (pendingSave) clearTimeout(pendingSave);
    setSaveDebounceRef.current.delete(setId);
    latestSetSnapshotRef.current.delete(setId);
    removeMirrorSet(sessionId, setId);

    const result = await deleteSet(setId);
    if (result.error) {
      setExercises(snapshot);
      if (wasConfirmed) {
        setConfirmedSets((prev) => new Set(prev).add(setId));
      }
      timerTriggeredSetsRef.current.add(setId);
    }
  }, [sessionId]);

  const handleSaveDescription = useCallback(
    async (exerciseId: string) => {
      await updateExerciseDescription(exerciseId, editDescriptionValue);
      setExercises((prev) =>
        prev.map((ex) =>
          ex.exercise_id === exerciseId
            ? { ...ex, exercise_description: editDescriptionValue.trim() || null }
            : ex
        )
      );
      setEditingDescriptionId(null);
    },
    [editDescriptionValue]
  );

  const handleAddExercise = useCallback(
    async (exerciseId: string) => {
      const exercise = availableExercises.find((e) => e.id === exerciseId);
      if (!exercise) return;

      // Find the exercise after which we're inserting
      const afterExId = addExerciseOpen;
      const insertIndex = exercises.findIndex((ex) => ex.id === afterExId);
      const insertAtOrder = insertIndex !== -1 ? exercises[insertIndex].order_index + 1 : exercises.length;
      const insertAtArrayPos = insertIndex !== -1 ? insertIndex + 1 : exercises.length;

      // Optimistic: insert exercise at the correct position
      const tempExId = `temp-ex-${Date.now()}`;
      const tempSetId = `temp-set-${Date.now()}`;
      const newExercise: SessionExercise = {
        id: tempExId,
        order_index: insertAtOrder,
        exercise_id: exerciseId,
        exercise_name: exercise.name,
        exercise_description: exercise.description,
        sets: [{ id: tempSetId, set_index: 0, kg: null, reps: null }],
        past_sessions: [],
      };

      // Build shifts from current state before optimistic update
      const shiftsById = exercises
        .slice(insertAtArrayPos)
        .map((ex) => ({ id: ex.id, order_index: ex.order_index + 1 }));

      setExercises((prev) => {
        const updated = [...prev];
        for (let i = insertAtArrayPos; i < updated.length; i++) {
          updated[i] = { ...updated[i], order_index: updated[i].order_index + 1 };
        }
        updated.splice(insertAtArrayPos, 0, newExercise);
        return updated;
      });
      setAddExerciseOpen(null);

      const result = await addExerciseToSession(sessionId, exerciseId, insertAtOrder, shiftsById.length > 0 ? shiftsById : undefined);
      if (result.error) {
        // Rollback on failure
        setExercises((prev) => prev.filter((ex) => ex.id !== tempExId));
        return;
      }

      // Replace temp IDs with real server IDs
      if (result.sessionExercise && result.initialSet) {
        const realEx = result.sessionExercise;
        const realSet = result.initialSet;
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === tempExId
              ? {
                  ...ex,
                  id: realEx.id,
                  order_index: realEx.order_index,
                  sets: [
                    {
                      ...realSet,
                      kg: ex.sets[0]?.kg ?? realSet.kg,
                      reps: ex.sets[0]?.reps ?? realSet.reps,
                    },
                  ],
                }
              : ex
          )
        );
        const snap = latestSetSnapshotRef.current.get(tempSetId);
        const tmr = setSaveDebounceRef.current.get(tempSetId);
        if (tmr) {
          clearTimeout(tmr);
          setSaveDebounceRef.current.delete(tempSetId);
        }
        latestSetSnapshotRef.current.delete(tempSetId);
        if (snap && (snap.kg != null || snap.reps != null)) {
          latestSetSnapshotRef.current.set(realSet.id, snap);
          migrateMirrorSetId(sessionId, tempSetId, realSet.id);
          schedulePersistSet(realSet.id);
        }
      }
    },
    [sessionId, availableExercises, addExerciseOpen, exercises, schedulePersistSet]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
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
                  {formatDuration(elapsed)}
                </p>
              </div>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <p className="text-xs font-bold tabular-nums tracking-tighter">
                <span className="text-muted-foreground/90">{confirmedSets.size}</span>
                <span className="font-semibold text-muted-foreground/55">
                  {" "}
                  {confirmedSets.size === 1 ? "set done" : "sets done"}
                </span>
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={handleEnd}
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
              ? "bg-destructive/25 text-destructive animate-pulse ring-2 ring-destructive/40"
              : restTargetMs !== null
                ? "bg-primary/10 text-primary"
                : "bg-muted/50 text-muted-foreground"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-base font-black tabular-nums whitespace-nowrap">
              Rest: {restTargetMs !== null ? formatDuration(restRemainingMs) : "—"}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 hidden sm:inline">
              {restTargetMs === null ? `Play uses ${formatSecondsAsClock(REST_DEFAULT_SECONDS)}` : restPaused ? "Paused" : "Running"}
            </span>
            {restTargetMs === null ? (
              <button
                type="button"
                className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors text-primary shrink-0"
                aria-label={`Start rest timer (${formatSecondsAsClock(REST_DEFAULT_SECONDS)})`}
                onClick={() => startRestCountdown(REST_DEFAULT_SECONDS)}
              >
                <Play className="size-4.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors shrink-0"
                  aria-label={restPaused ? "Resume rest timer" : "Pause rest timer"}
                  onClick={() => setRestPaused((p) => !p)}
                >
                  {restPaused ? <Play className="size-4.5" /> : <Pause className="size-4.5" />}
                </button>
                <button
                  type="button"
                  className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors shrink-0"
                  aria-label="Restart rest timer"
                  onClick={() => {
                    if (restTargetMs != null) {
                      alarmConsumedRef.current = false;
                      setRestRemainingMs(restTargetMs);
                      setRestPaused(false);
                      setRestAlarmFlash(false);
                    }
                  }}
                >
                  <RotateCcw className="size-4.5" />
                </button>
                <button
                  type="button"
                  className="size-9 rounded-full hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center transition-colors shrink-0"
                  aria-label="Stop rest timer"
                  onClick={() => {
                    setRestTargetMs(null);
                    setRestRemainingMs(0);
                    setRestPaused(false);
                    setRestAlarmFlash(false);
                    alarmConsumedRef.current = false;
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
                      ? `${Math.min(100, Math.round((restRemainingMs / restTargetMs) * 100))}%`
                      : "0%",
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 max-w-2xl mx-auto">
        {exercises.map((ex) => (
          <div key={ex.id} className="space-y-2">
          <Card className="overflow-hidden shadow-sm border-muted/60">
            <CardHeader className="py-3 px-4 bg-muted/30 border-b">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-bold tracking-tight min-w-0 pt-0.5">
                  {ex.exercise_name}
                </CardTitle>
                <div className="flex items-center gap-2 shrink-0">
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
                            setCustomRestDraft(String(restDurations[ex.exercise_id] ?? REST_DEFAULT_SECONDS));
                            return ex.exercise_id;
                          }
                          return null;
                        });
                      }}
                    >
                      <Clock className="size-3 shrink-0 opacity-70" aria-hidden />
                      Rest {formatSecondsAsClock(restDurations[ex.exercise_id] ?? REST_DEFAULT_SECONDS)}
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
                              (restDurations[ex.exercise_id] ?? REST_DEFAULT_SECONDS) === sec;
                            return (
                              <Button
                                key={sec}
                                type="button"
                                size="sm"
                                variant={active ? "default" : "outline"}
                                className="h-8 rounded-lg px-2 text-xs font-bold tabular-nums"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRestDurations((prev) => ({ ...prev, [ex.exercise_id]: sec }));
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
                                if (e.key === "Enter") {
                                  const v = parseInt(customRestDraft, 10);
                                  if (!Number.isFinite(v)) return;
                                  const clamped = Math.min(3600, Math.max(10, v));
                                  setRestDurations((prev) => ({ ...prev, [ex.exercise_id]: clamped }));
                                  setRestPickerOpen(null);
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
                              const v = parseInt(customRestDraft, 10);
                              if (!Number.isFinite(v)) return;
                              const clamped = Math.min(3600, Math.max(10, v));
                              setRestDurations((prev) => ({ ...prev, [ex.exercise_id]: clamped }));
                              setRestPickerOpen(null);
                            }}
                          >
                            Set
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap pt-1">
                    {ex.sets.length} {ex.sets.length === 1 ? "Set" : "Sets"}
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
                  onBlur={() => handleSaveDescription(ex.exercise_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveDescription(ex.exercise_id);
                    if (e.key === "Escape") setEditingDescriptionId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="text-left w-full"
                  onClick={() => {
                    setEditingDescriptionId(ex.exercise_id);
                    setEditDescriptionValue(ex.exercise_description ?? "");
                  }}
                >
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {ex.exercise_description || "Add notes..."}
                  </p>
                </button>
              )}
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {ex.past_sessions.length > 0 &&
                (ex.past_sessions.length === 1 ? (
                  <div className="mb-4 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-foreground animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex min-w-0 items-center gap-2">
                      <TrendingUp className="size-3 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-primary/70">
                          Last time
                        </span>
                        <p className="truncate text-xs font-mono font-bold text-primary/90">
                          {ex.past_sessions[0].sets.length > 0
                            ? formatPastSetsLine(ex.past_sessions[0].sets)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <details className="group mb-4 rounded-xl border border-primary/10 bg-primary/5 text-foreground animate-in fade-in zoom-in-95 duration-500 open:pb-2">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <TrendingUp className="size-3 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-primary/70">
                            Last time
                          </span>
                          <p className="truncate text-xs font-mono font-bold text-primary/90">
                            {ex.past_sessions[0].sets.length > 0
                              ? formatPastSetsLine(ex.past_sessions[0].sets)
                              : "—"}
                          </p>
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
                                : "—"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              {ex.sets.length > 0 && (
                <div className="grid grid-cols-[1fr_1fr_40px_40px] gap-3 px-1 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">KG</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Reps</span>
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
                  <div className="relative">
                    <Input
                      id={`kg-${set.id}`}
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="0"
                      value={set.kg ?? ""}
                      onChange={(e) =>
                        handleSetChange(set.id, ex.exercise_id, "kg", e.target.value === "" ? "" : parseFloat(e.target.value))
                      }
                      onBlur={() => persistSetNow(set.id)}
                      className="h-9 rounded-xl font-bold bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Input
                      id={`reps-${set.id}`}
                      type="number"
                      min={0}
                      placeholder="0"
                      value={set.reps ?? ""}
                      onChange={(e) =>
                        handleSetChange(set.id, ex.exercise_id, "reps", e.target.value === "" ? "" : parseInt(e.target.value, 10))
                      }
                      onBlur={() => persistSetNow(set.id)}
                      className="h-9 rounded-xl font-bold bg-background/50 focus:bg-background transition-colors"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`size-8 rounded-full transition-colors ${
                        confirmedSets.has(set.id)
                          ? "bg-green-500/15 text-green-600 hover:bg-green-500/25"
                          : "text-muted-foreground/30 hover:text-green-600 hover:bg-green-500/10"
                      }`}
                      onClick={() => handleConfirmSet(set.id)}
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
                      onClick={() => handleDeleteSet(set.id)}
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
                onClick={() => handleAddSet(ex.id)}
              >
                <Plus className="size-3 mr-1" /> Add Set
              </Button>
            </CardContent>
          </Card>
          {addExerciseOpen === ex.id ? (
            <div className="p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Add Exercise</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full"
                  onClick={() => setAddExerciseOpen(null)}
                >
                  <X className="size-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableExercises
                  .filter(
                    (e) => !exercises.some((se) => se.exercise_id === e.id)
                  )
                  .map((e) => (
                    <Button
                      key={e.id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-xl font-bold h-8 px-3 text-xs hover:bg-primary hover:text-primary-foreground transition-all"
                      onClick={() => handleAddExercise(e.id)}
                    >
                      {e.name}
                    </Button>
                  ))}
              </div>
              {availableExercises.filter(
                (e) => !exercises.some((se) => se.exercise_id === e.id)
              ).length === 0 && (
                <p className="text-xs text-center py-2 text-muted-foreground font-medium italic">
                  All exercises are already added.
                </p>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                className="size-7 rounded-full border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/10 hover:text-primary text-muted-foreground/40 flex items-center justify-center transition-all"
                onClick={() => setAddExerciseOpen(ex.id)}
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          )}
          </div>
        ))}
      </div>
    </div>
  );
}
