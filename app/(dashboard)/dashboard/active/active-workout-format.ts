import type { MirrorSetRow } from '@/app/(dashboard)/dashboard/active/active-workout-mirror';
import type { SessionExercise } from '@/app/(dashboard)/dashboard/active/active-workout-types';
import {
  computeWarmupPair,
  topSetKgFromPastSessions,
} from '@/lib/warmup-settings';

export function formatSecondsAsClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function playRestCompleteBeep() {
  try {
    const AudioCtx =
      typeof window !== 'undefined'
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        : undefined;
    if (!AudioCtx) {
      return;
    }
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
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

/** Beep, optional vibrate, and flash UI when rest hits zero (shared by hooks). */
export function triggerRestCompleteUiFlash(
  setRestAlarmFlash: (v: boolean) => void
) {
  playRestCompleteBeep();
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    navigator.vibrate(200);
  }
  setRestAlarmFlash(true);
  window.setTimeout(() => setRestAlarmFlash(false), 2200);
}

export function mergeMirrorIntoExercises(
  exercises: SessionExercise[],
  mirrorSets: Record<string, MirrorSetRow>
): SessionExercise[] {
  return exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => {
      const m = mirrorSets[s.id];
      if (!m) {
        return s;
      }
      return {
        ...s,
        kg: m.kg,
        reps: m.reps,
        completed: m.completed ?? s.completed,
      };
    }),
  }));
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatPastSetsLine(
  sets: { kg: number | null; reps: number | null }[]
): string {
  return sets.map((s) => `${s.kg ?? 0}×${s.reps ?? 0}`).join(', ');
}

/** Local calendar dates at noon to avoid DST non–24h gaps when diffing days. */
function localCalendarDaysBetween(from: Date, to: Date): number {
  const noon = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  return Math.round((noon(to).getTime() - noon(from).getTime()) / 86_400_000);
}

/** Whole local calendar days from completed session (`endedAt`) until `now`. */
export function formatDaysSinceEnded(endedAtIso: string, now = new Date()): string {
  const ended = new Date(endedAtIso);
  if (Number.isNaN(ended.getTime())) {
    return '';
  }
  const n = localCalendarDaysBetween(ended, now);
  if (n <= 0) {
    return 'Today';
  }
  if (n === 1) {
    return 'Yesterday';
  }
  return `${n} days ago`;
}

export function warmupBannerForExercise(ex: SessionExercise): {
  topKg: number;
  pair: NonNullable<ReturnType<typeof computeWarmupPair>>;
} | null {
  const topKg = topSetKgFromPastSessions(ex.past_sessions);
  if (topKg === null || topKg === undefined) {
    return null;
  }
  const pair = computeWarmupPair(topKg, ex.warmup_settings);
  if (!pair) {
    return null;
  }
  return { topKg, pair };
}
