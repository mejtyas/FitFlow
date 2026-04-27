ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS warmup_settings jsonb DEFAULT NULL;
