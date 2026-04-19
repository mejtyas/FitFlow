-- Atomically replace all exercises on a workout template (transaction, RLS applies via invoker).

CREATE OR REPLACE FUNCTION replace_workout_exercises(
  p_workout_id uuid,
  p_exercises jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workouts w
    WHERE w.id = p_workout_id AND w.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Workout not found or access denied';
  END IF;

  DELETE FROM workout_exercises WHERE workout_id = p_workout_id;

  IF p_exercises IS NOT NULL
     AND jsonb_typeof(p_exercises) = 'array'
     AND jsonb_array_length(p_exercises) > 0 THEN
    INSERT INTO workout_exercises (workout_id, exercise_id, order_index, default_sets)
    SELECT
      p_workout_id,
      (elem->>'exercise_id')::uuid,
      (elem->>'order_index')::int,
      COALESCE((elem->>'default_sets')::int, 2)
    FROM jsonb_array_elements(p_exercises) AS elem;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION replace_workout_exercises(uuid, jsonb) TO authenticated;
