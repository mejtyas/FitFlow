-- Persisted wall-clock rest segments (for history); independent of live countdown columns on workout_sessions.
CREATE TABLE session_rest_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id uuid NOT NULL REFERENCES workout_sessions (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  planned_target_ms integer NOT NULL
);

CREATE INDEX session_rest_periods_session_started_idx
  ON session_rest_periods (workout_session_id, started_at);

COMMENT ON TABLE session_rest_periods IS 'Each row is one rest countdown segment: started_at when timer started/restarted; ended_at when stopped, skipped, completed, or session ended.';
COMMENT ON COLUMN session_rest_periods.planned_target_ms IS 'Target length (ms) for this segment when it began (matches rest ring).';

ALTER TABLE session_rest_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_rest_periods_select_own" ON session_rest_periods FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_rest_periods.workout_session_id AND ws.user_id = auth.uid()
  ));

CREATE POLICY "session_rest_periods_insert_own" ON session_rest_periods FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_rest_periods.workout_session_id AND ws.user_id = auth.uid()
  ));

CREATE POLICY "session_rest_periods_update_own" ON session_rest_periods FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_rest_periods.workout_session_id AND ws.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_rest_periods.workout_session_id AND ws.user_id = auth.uid()
  ));

CREATE POLICY "session_rest_periods_delete_own" ON session_rest_periods FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_rest_periods.workout_session_id AND ws.user_id = auth.uid()
  ));
