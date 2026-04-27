export type RestTimerOp =
  | { kind: 'start'; durationMs: number }
  | { kind: 'stop' }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'restart' }
  | { kind: 'pull' };

export type RestTimerRow = {
  rest_target_ms: number | null;
  rest_ends_at: string | null;
  rest_paused_remaining_ms: number | null;
};

export type RestTimerClientState = {
  targetMs: number | null;
  remainingMs: number;
  paused: boolean;
  endsAtIso: string | null;
};
