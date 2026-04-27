-- Server-authoritative rest countdown (survives tab sleep / background throttling)
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS rest_target_ms integer,
  ADD COLUMN IF NOT EXISTS rest_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS rest_paused_remaining_ms integer;

COMMENT ON COLUMN workout_sessions.rest_target_ms IS 'Total rest segment length (ms) for UI ring; set when rest is active or paused.';
COMMENT ON COLUMN workout_sessions.rest_ends_at IS 'When running, wall time (server) when rest completes; NULL if idle or paused.';
COMMENT ON COLUMN workout_sessions.rest_paused_remaining_ms IS 'When paused, remaining ms; NULL if running or idle.';
