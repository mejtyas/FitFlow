-- Row Level Security for workout-related tables (users only access own rows).

ALTER TABLE IF EXISTS workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS session_sets ENABLE ROW LEVEL SECURITY;

-- workouts
CREATE POLICY "workouts_select_own" ON workouts FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "workouts_insert_own" ON workouts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "workouts_update_own" ON workouts FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "workouts_delete_own" ON workouts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- exercises
CREATE POLICY "exercises_select_own" ON exercises FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "exercises_insert_own" ON exercises FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "exercises_update_own" ON exercises FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "exercises_delete_own" ON exercises FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- workout_sessions
CREATE POLICY "workout_sessions_select_own" ON workout_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "workout_sessions_insert_own" ON workout_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "workout_sessions_update_own" ON workout_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "workout_sessions_delete_own" ON workout_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- workout_exercises (scoped via workouts.user_id)
CREATE POLICY "workout_exercises_select_own" ON workout_exercises FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workouts w
    WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "workout_exercises_insert_own" ON workout_exercises FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workouts w
    WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "workout_exercises_update_own" ON workout_exercises FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workouts w
    WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workouts w
    WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "workout_exercises_delete_own" ON workout_exercises FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workouts w
    WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid()
  ));

-- session_exercises (scoped via workout_sessions.user_id)
CREATE POLICY "session_exercises_select_own" ON session_exercises FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_exercises.workout_session_id AND ws.user_id = auth.uid()
  ));
CREATE POLICY "session_exercises_insert_own" ON session_exercises FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_exercises.workout_session_id AND ws.user_id = auth.uid()
  ));
CREATE POLICY "session_exercises_update_own" ON session_exercises FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_exercises.workout_session_id AND ws.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_exercises.workout_session_id AND ws.user_id = auth.uid()
  ));
CREATE POLICY "session_exercises_delete_own" ON session_exercises FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_exercises.workout_session_id AND ws.user_id = auth.uid()
  ));

-- session_sets (scoped via session_exercises -> workout_sessions)
CREATE POLICY "session_sets_select_own" ON session_sets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.workout_session_id
    WHERE se.id = session_sets.session_exercise_id AND ws.user_id = auth.uid()
  ));
CREATE POLICY "session_sets_insert_own" ON session_sets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.workout_session_id
    WHERE se.id = session_sets.session_exercise_id AND ws.user_id = auth.uid()
  ));
CREATE POLICY "session_sets_update_own" ON session_sets FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.workout_session_id
    WHERE se.id = session_sets.session_exercise_id AND ws.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.workout_session_id
    WHERE se.id = session_sets.session_exercise_id AND ws.user_id = auth.uid()
  ));
CREATE POLICY "session_sets_delete_own" ON session_sets FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.workout_session_id
    WHERE se.id = session_sets.session_exercise_id AND ws.user_id = auth.uid()
  ));
