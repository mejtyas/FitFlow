CREATE OR REPLACE FUNCTION add_exercise_to_session(
  p_session_id uuid,
  p_exercise_id uuid,
  p_order_index int,
  p_shift_ids uuid[] DEFAULT '{}',
  p_shift_orders int[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_se_id uuid;
  v_set_id uuid;
BEGIN
  -- Bulk shift existing exercises (single UPDATE using unnest)
  IF array_length(p_shift_ids, 1) > 0 THEN
    UPDATE session_exercises se
    SET order_index = shifts.new_order
    FROM unnest(p_shift_ids, p_shift_orders) AS shifts(id, new_order)
    WHERE se.id = shifts.id;
  END IF;

  -- Insert the new session exercise
  INSERT INTO session_exercises (workout_session_id, exercise_id, order_index)
  VALUES (p_session_id, p_exercise_id, p_order_index)
  RETURNING id INTO v_se_id;

  -- Insert the initial empty set
  INSERT INTO session_sets (session_exercise_id, set_index, kg, reps)
  VALUES (v_se_id, 0, NULL, NULL)
  RETURNING id INTO v_set_id;

  RETURN jsonb_build_object(
    'session_exercise_id', v_se_id,
    'order_index', p_order_index,
    'set_id', v_set_id
  );
END;
$$;
