-- Persist "set done" (checkmark) across reloads / app backgrounding
ALTER TABLE session_sets
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN session_sets.completed IS 'User marked set as done (check) or auto-done when kg+reps filled';
