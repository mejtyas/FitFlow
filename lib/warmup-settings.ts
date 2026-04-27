import type { Json } from '@/lib/supabase/database.types';

export type WarmupSettings = {
  w1_pct_low: number;
  w1_pct_high: number;
  w1_reps: number;
  w2_pct: number;
  w2_reps: number;
};

const DEFAULT_WARMUP_SETTINGS: WarmupSettings = {
  w1_pct_low: 40,
  w1_pct_high: 50,
  w1_reps: 6,
  w2_pct: 80,
  w2_reps: 2,
};

function roundToHalf(kg: number): number {
  if (!Number.isFinite(kg) || kg <= 0) {return 0;}
  return Math.round(kg * 2) / 2;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) {return min;}
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Merge DB JSON with defaults; invalid keys fall back to defaults. */
export function parseWarmupSettings(raw: Json | null | undefined): WarmupSettings {
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_WARMUP_SETTINGS };
  }
  const o = raw as Record<string, unknown>;
  const w1lo = clampInt(Number(o.w1_pct_low), 1, 100);
  const w1hi = clampInt(Number(o.w1_pct_high), 1, 100);
  const w1reps = clampInt(Number(o.w1_reps), 1, 99);
  const w2pct = clampInt(Number(o.w2_pct), 1, 100);
  const w2reps = clampInt(Number(o.w2_reps), 1, 99);
  const low = Math.min(w1lo, w1hi);
  const high = Math.max(w1lo, w1hi);
  return {
    w1_pct_low: low,
    w1_pct_high: high,
    w1_reps: w1reps,
    w2_pct: w2pct,
    w2_reps: w2reps,
  };
}

function topSetKgFromSets(sets: { kg: number | null; reps: number | null }[]): number | null {
  let max = 0;
  for (const s of sets) {
    const k = s.kg;
    if (k !== null && k !== undefined && Number.isFinite(k) && k > max) {max = k;}
  }
  return max > 0 ? max : null;
}

/** Newest session first; skips sessions with no positive kg (e.g. placeholder 0×0 logs). */
export function topSetKgFromPastSessions(
  sessions: { sets: { kg: number | null; reps: number | null }[] }[]
): number | null {
  for (const session of sessions) {
    const top = topSetKgFromSets(session.sets);
    if (top !== null && top !== undefined) {return top;}
  }
  return null;
}

type WarmupPair = {
  w1: { kg: number; reps: number };
  w2: { kg: number; reps: number };
};

export function computeWarmupPair(topKg: number, settings: WarmupSettings): WarmupPair | null {
  if (!Number.isFinite(topKg) || topKg <= 0) {return null;}
  const midPct = (settings.w1_pct_low + settings.w1_pct_high) / 2 / 100;
  const w1kg = roundToHalf(topKg * midPct);
  const w2kg = roundToHalf(topKg * (settings.w2_pct / 100));
  if (w1kg <= 0 && w2kg <= 0) {return null;}
  return {
    w1: { kg: w1kg, reps: settings.w1_reps },
    w2: { kg: w2kg, reps: settings.w2_reps },
  };
}

export function warmupSettingsToJson(settings: WarmupSettings): Json {
  return {
    w1_pct_low: settings.w1_pct_low,
    w1_pct_high: settings.w1_pct_high,
    w1_reps: settings.w1_reps,
    w2_pct: settings.w2_pct,
    w2_reps: settings.w2_reps,
  };
}
