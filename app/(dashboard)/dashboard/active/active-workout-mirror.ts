import { ACTIVE_SESSION_LS_PREFIX } from '@/app/(dashboard)/dashboard/active/active-workout-constants';

export function activeSessionMirrorKey(sessionId: string): string {
  return `${ACTIVE_SESSION_LS_PREFIX}${sessionId}`;
}

/** Persisted rest countdown (v2 mirror); running uses wall-clock endAt so remaining survives refresh */
export type RestMirrorPersist =
  | {
      targetMs: number;
      paused: boolean;
      /** When running: unix ms when countdown hits 0; unused when paused */
      endAt: number;
      remainingMsPaused?: number;
    }
  | null;

export type MirrorSetRow = {
  kg: number | null;
  reps: number | null;
  completed?: boolean;
};

export type MirrorPayload = {
  v: 1 | 2 | 3;
  sessionId: string;
  updatedAt: number;
  sets: Record<string, MirrorSetRow>;
  rest?: RestMirrorPersist;
  /** exercise_library id → rest duration in seconds */
  restDurations?: Record<string, number>;
};

export function readMirror(sessionId: string): MirrorPayload | null {
  try {
    const raw = localStorage.getItem(activeSessionMirrorKey(sessionId));
    if (!raw) {
      return null;
    }
    const p = JSON.parse(raw) as MirrorPayload;
    if (p.v !== 1 && p.v !== 2 && p.v !== 3) {
      return null;
    }
    if (p.sessionId !== sessionId || !p.sets) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function patchRestMirrorFromValues(
  sessionId: string,
  target: number | null,
  remaining: number,
  paused: boolean,
  endsAtIso?: string | null
): void {
  try {
    const prev = readMirror(sessionId);
    const sets = prev?.sets ?? {};
    const rest: RestMirrorPersist =
      target === null || target === undefined
        ? null
        : paused
          ? {
              targetMs: target,
              paused: true,
              endAt: 0,
              remainingMsPaused: remaining,
            }
          : {
              targetMs: target,
              paused: false,
              endAt:
                endsAtIso && endsAtIso.length > 0
                  ? new Date(endsAtIso).getTime()
                  : Date.now() + remaining,
            };
    const next: MirrorPayload = {
      v: 3,
      sessionId,
      updatedAt: Date.now(),
      sets,
      rest,
      restDurations: prev?.restDurations,
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

export function writeMirrorPatch(
  sessionId: string,
  setId: string,
  row: { kg: number | null; reps: number | null; completed: boolean },
  restDurations?: Record<string, number>
): void {
  try {
    const prev = readMirror(sessionId);
    const sets = { ...(prev?.sets ?? {}) };
    sets[setId] = {
      kg: row.kg,
      reps: row.reps,
      completed: row.completed,
    };
    const next: MirrorPayload = {
      v: 3,
      sessionId,
      updatedAt: Date.now(),
      sets,
      rest: prev?.rest,
      restDurations: restDurations ?? prev?.restDurations,
    };
    localStorage.setItem(
      activeSessionMirrorKey(sessionId),
      JSON.stringify(next)
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function removeMirrorSet(sessionId: string, setId: string): void {
  try {
    const m = readMirror(sessionId);
    if (!m?.sets || !(setId in m.sets)) {
      return;
    }
    const sets = { ...m.sets };
    delete sets[setId];
    if (Object.keys(sets).length === 0) {
      if (m.rest?.targetMs) {
        localStorage.setItem(
          activeSessionMirrorKey(sessionId),
          JSON.stringify({
            ...m,
            v: 3 as const,
            sets: {},
            updatedAt: Date.now(),
            restDurations: m.restDurations,
          })
        );
        return;
      }
      localStorage.removeItem(activeSessionMirrorKey(sessionId));
      return;
    }
    localStorage.setItem(
      activeSessionMirrorKey(sessionId),
      JSON.stringify({ ...m, v: 3 as const, sets, updatedAt: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

export function clearMirror(sessionId: string): void {
  try {
    localStorage.removeItem(activeSessionMirrorKey(sessionId));
  } catch {
    /* ignore */
  }
}

export function migrateMirrorSetId(
  sessionId: string,
  fromId: string,
  toId: string
): void {
  try {
    const m = readMirror(sessionId);
    if (!m?.sets[fromId]) {
      return;
    }
    const sets = { ...m.sets };
    sets[toId] = sets[fromId];
    delete sets[fromId];
    localStorage.setItem(
      activeSessionMirrorKey(sessionId),
      JSON.stringify({
        ...m,
        v: 3 as const,
        sets,
        updatedAt: Date.now(),
      })
    );
  } catch {
    /* ignore */
  }
}
