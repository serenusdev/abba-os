-- Presence must be based on an explicit heartbeat, not profile mutation time.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles(last_seen_at DESC);

CREATE OR REPLACE FUNCTION app.touch_presence()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT app.is_active_member() THEN
    RETURN false;
  END IF;
  UPDATE public.profiles
  SET last_seen_at = now()
  WHERE id = auth.uid() AND status = 'active';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION app.touch_presence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.touch_presence() TO authenticated;
