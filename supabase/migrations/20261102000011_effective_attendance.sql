-- Effective attendance model: raw check-ins remain immutable history while
-- this table stores the auditable operational result for each user/date.
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.non_operational_dates (
  attendance_date date PRIMARY KEY,
  reason text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_duty_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_from date NOT NULL,
  date_to date,
  attendance_required boolean NOT NULL DEFAULT true,
  report_required boolean NOT NULL DEFAULT true,
  reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_duty_flags_dates CHECK (date_to IS NULL OR date_to >= date_from)
);

CREATE TABLE IF NOT EXISTS public.attendance_effective (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('on_time', 'grace', 'late', 'excused', 'sick', 'duty', 'no_checkin', 'non_operational', 'not_required')),
  source_type text NOT NULL CHECK (source_type IN ('attendance_record', 'correction', 'exception', 'calendar', 'duty_flag')),
  source_id uuid,
  policy_version_id text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_effective_date ON public.attendance_effective(attendance_date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_duty_flags_user_date ON public.attendance_duty_flags(user_id, date_from, date_to);

ALTER TABLE public.non_operational_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_duty_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_effective ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active users can view non operational dates" ON public.non_operational_dates;
CREATE POLICY "Active users can view non operational dates"
  ON public.non_operational_dates FOR SELECT TO authenticated
  USING (app.is_active_member());

DROP POLICY IF EXISTS "Users can view own duty flags" ON public.attendance_duty_flags;
CREATE POLICY "Users can view own duty flags"
  ON public.attendance_duty_flags FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR app.has_any_role('super_admin', 'yayasan', 'pengurus'));

DROP POLICY IF EXISTS "Users can view own effective attendance" ON public.attendance_effective;
CREATE POLICY "Users can view own effective attendance"
  ON public.attendance_effective FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR app.has_any_role('super_admin', 'yayasan', 'pengurus'));

CREATE OR REPLACE FUNCTION app.refresh_attendance_effective(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tanggal snapshot wajib diisi.');
  END IF;

  INSERT INTO public.attendance_effective (
    user_id, attendance_date, status, source_type, source_id, policy_version_id, generated_at
  )
  SELECT
    p.id,
    p_date,
    CASE
      WHEN nod.attendance_date IS NOT NULL THEN 'non_operational'
      WHEN COALESCE(df.attendance_required, (p.member_type IN ('santri', 'koordinator'))) = false THEN 'not_required'
      WHEN corr.id IS NOT NULL THEN corr.requested_classification::text
      WHEN exc.id IS NOT NULL THEN exc.type
      WHEN ar.id IS NOT NULL THEN ar.classification::text
      ELSE 'no_checkin'
    END,
    CASE
      WHEN nod.attendance_date IS NOT NULL THEN 'calendar'
      WHEN COALESCE(df.attendance_required, (p.member_type IN ('santri', 'koordinator'))) = false THEN 'duty_flag'
      WHEN corr.id IS NOT NULL THEN 'correction'
      WHEN exc.id IS NOT NULL THEN 'exception'
      WHEN ar.id IS NOT NULL THEN 'attendance_record'
      ELSE 'attendance_record'
    END,
    COALESCE(corr.id, exc.id, ar.id),
    ar.policy_version_id,
    now()
  FROM public.profiles p
  LEFT JOIN public.non_operational_dates nod ON nod.attendance_date = p_date
  LEFT JOIN LATERAL (
    SELECT f.attendance_required
    FROM public.attendance_duty_flags f
    WHERE f.user_id = p.id AND f.date_from <= p_date AND (f.date_to IS NULL OR f.date_to >= p_date)
    ORDER BY f.created_at DESC LIMIT 1
  ) df ON true
  LEFT JOIN LATERAL (
    SELECT c.id, c.requested_classification
    FROM public.attendance_corrections c
    WHERE c.user_id = p.id AND c.attendance_date = p_date AND c.status = 'approved'
    ORDER BY c.decided_at DESC NULLS LAST LIMIT 1
  ) corr ON true
  LEFT JOIN LATERAL (
    SELECT e.id, e.type
    FROM public.attendance_exceptions e
    WHERE e.user_id = p.id AND e.date_from <= p_date AND e.date_to >= p_date AND e.status = 'approved'
    ORDER BY e.decided_at DESC NULLS LAST LIMIT 1
  ) exc ON true
  LEFT JOIN public.attendance_records ar ON ar.user_id = p.id AND ar.attendance_date = p_date
  WHERE p.status = 'active'
  ON CONFLICT (user_id, attendance_date) DO UPDATE SET
    status = EXCLUDED.status,
    source_type = EXCLUDED.source_type,
    source_id = EXCLUDED.source_id,
    policy_version_id = EXCLUDED.policy_version_id,
    generated_at = EXCLUDED.generated_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'attendance_date', p_date, 'rows', v_count);
END;
$$;

REVOKE ALL ON FUNCTION app.refresh_attendance_effective(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.refresh_attendance_effective(date) TO authenticated;

CREATE OR REPLACE FUNCTION app.refresh_attendance_after_record()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app, pg_temp AS $$
BEGIN
  PERFORM app.refresh_attendance_effective(NEW.attendance_date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_attendance_after_record ON public.attendance_records;
CREATE TRIGGER trg_refresh_attendance_after_record
  AFTER INSERT OR UPDATE OF classification, updated_at ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION app.refresh_attendance_after_record();

CREATE OR REPLACE FUNCTION app.refresh_attendance_after_exception()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app, pg_temp AS $$
DECLARE v_date date;
BEGIN
  FOR v_date IN SELECT generate_series(NEW.date_from, NEW.date_to, interval '1 day')::date LOOP
    PERFORM app.refresh_attendance_effective(v_date);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_attendance_after_exception ON public.attendance_exceptions;
CREATE TRIGGER trg_refresh_attendance_after_exception
  AFTER INSERT OR UPDATE OF status, date_from, date_to ON public.attendance_exceptions
  FOR EACH ROW EXECUTE FUNCTION app.refresh_attendance_after_exception();

CREATE OR REPLACE FUNCTION app.refresh_attendance_after_correction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app, pg_temp AS $$
BEGIN
  PERFORM app.refresh_attendance_effective(NEW.attendance_date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_attendance_after_correction ON public.attendance_corrections;
CREATE TRIGGER trg_refresh_attendance_after_correction
  AFTER INSERT OR UPDATE OF status, requested_classification, attendance_date ON public.attendance_corrections
  FOR EACH ROW EXECUTE FUNCTION app.refresh_attendance_after_correction();
