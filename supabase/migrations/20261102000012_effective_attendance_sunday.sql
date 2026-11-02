-- Sundays are always non-operational; 00011 also supports explicit closures.
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
      WHEN nod.attendance_date IS NOT NULL OR EXTRACT(DOW FROM p_date) = 0 THEN 'non_operational'
      WHEN COALESCE(df.attendance_required, (p.member_type IN ('santri', 'koordinator'))) = false THEN 'not_required'
      WHEN corr.id IS NOT NULL THEN corr.requested_classification::text
      WHEN exc.id IS NOT NULL THEN exc.type
      WHEN ar.id IS NOT NULL THEN ar.classification::text
      ELSE 'no_checkin'
    END,
    CASE
      WHEN nod.attendance_date IS NOT NULL OR EXTRACT(DOW FROM p_date) = 0 THEN 'calendar'
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
