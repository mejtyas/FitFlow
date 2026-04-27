-- Order in which the user first logged kg/reps per exercise (vs UI order_index).

ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS next_logged_order integer NOT NULL DEFAULT 0;

ALTER TABLE session_exercises
  ADD COLUMN IF NOT EXISTS first_logged_at timestamptz,
  ADD COLUMN IF NOT EXISTS logged_order integer;

CREATE OR REPLACE FUNCTION record_session_exercise_first_log(p_session_exercise_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ws_id uuid;
  v_logged_order int;
  v_next int;
  v_has_data boolean;
  v_updated int;
BEGIN
  SELECT workout_session_id, logged_order
  INTO v_ws_id, v_logged_order
  FROM session_exercises
  WHERE id = p_session_exercise_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_logged_order IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM session_sets
    WHERE session_exercise_id = p_session_exercise_id
      AND (kg IS NOT NULL OR reps IS NOT NULL)
  ) INTO v_has_data;

  IF NOT v_has_data THEN
    RETURN;
  END IF;

  -- Lock session row first (stable lock order vs other writers on this session).
  SELECT next_logged_order INTO v_next
  FROM workout_sessions
  WHERE id = v_ws_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE session_exercises se
  SET
    logged_order = v_next,
    first_logged_at = now()
  WHERE se.id = p_session_exercise_id
    AND se.logged_order IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    UPDATE workout_sessions
    SET next_logged_order = next_logged_order + 1
    WHERE id = v_ws_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION record_session_exercise_first_log(uuid) TO authenticated;
