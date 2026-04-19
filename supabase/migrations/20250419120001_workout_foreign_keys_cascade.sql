-- Cascade deletes so child rows are removed when parents are deleted.

ALTER TABLE IF EXISTS session_sets
  DROP CONSTRAINT IF EXISTS session_sets_session_exercise_id_fkey;

ALTER TABLE IF EXISTS session_sets
  ADD CONSTRAINT session_sets_session_exercise_id_fkey
  FOREIGN KEY (session_exercise_id)
  REFERENCES session_exercises(id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_workout_session_id_fkey;

ALTER TABLE IF EXISTS session_exercises
  ADD CONSTRAINT session_exercises_workout_session_id_fkey
  FOREIGN KEY (workout_session_id)
  REFERENCES workout_sessions(id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS workout_exercises
  DROP CONSTRAINT IF EXISTS workout_exercises_workout_id_fkey;

ALTER TABLE IF EXISTS workout_exercises
  ADD CONSTRAINT workout_exercises_workout_id_fkey
  FOREIGN KEY (workout_id)
  REFERENCES workouts(id)
  ON DELETE CASCADE;
