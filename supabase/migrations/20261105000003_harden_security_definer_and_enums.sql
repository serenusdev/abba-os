-- Migration: 20261105000003_harden_security_definer_and_enums.sql
-- Description: Harden SECURITY DEFINER search_path on trigger functions (Audit Finding F-16).

CREATE OR REPLACE FUNCTION public.update_device_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

