-- Audit hardening follow-up: close remaining direct-RPC bypasses for inactive
-- accounts and prevent coordinators from requesting another team's analytics.

CREATE OR REPLACE FUNCTION app.has_permission(perm_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app, pg_temp
STABLE
AS $$
  SELECT app.is_active_member() AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND ur.revoked_at IS NULL
      AND p.key = perm_key
  );
$$;

-- Attendance is callable through PostgREST, so the server action's guard must
-- be duplicated at the SECURITY DEFINER boundary.
CREATE OR REPLACE FUNCTION app.attendance_check_in(
  p_user_id uuid,
  p_client_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_date date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  v_time time := (now() AT TIME ZONE 'Asia/Jakarta')::time;
  v_policy public.policy_settings%ROWTYPE;
  v_record public.attendance_records%ROWTYPE;
  v_classification public.attendance_classification_type;
  v_minutes_after integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id OR NOT app.is_active_member() THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'message', 'Sesi tidak valid atau akun tidak aktif.');
  END IF;
  IF EXTRACT(DOW FROM (now() AT TIME ZONE 'Asia/Jakarta')) = 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'ATT_NON_OPERATIONAL_DAY', 'message', 'Hari Ahad/Minggu adalah hari non-operasional presensi.');
  END IF;

  SELECT * INTO v_policy
  FROM public.policy_settings
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ATT_POLICY_UNAVAILABLE', 'message', 'Kebijakan presensi aktif belum tersedia.');
  END IF;

  IF v_time <= v_policy.attendance_cutoff_time + interval '59 seconds' THEN
    v_classification := 'on_time';
  ELSIF v_time <= v_policy.attendance_grace_cutoff_time + interval '59 seconds' THEN
    v_classification := 'grace';
  ELSE
    v_classification := 'late';
    v_minutes_after := GREATEST(0, floor(EXTRACT(EPOCH FROM (v_time - v_policy.attendance_cutoff_time)) / 60));
  END IF;

  INSERT INTO public.attendance_records (
    user_id, attendance_date, checked_in_at, classification,
    minutes_after_deadline, policy_version_id, client_meta
  ) VALUES (
    p_user_id, v_date, v_now, v_classification, v_minutes_after,
    v_policy.id::text, COALESCE(p_client_meta, '{}'::jsonb)
  )
  ON CONFLICT (user_id, attendance_date) DO NOTHING
  RETURNING * INTO v_record;

  IF v_record.id IS NULL THEN
    SELECT * INTO v_record FROM public.attendance_records
    WHERE user_id = p_user_id AND attendance_date = v_date;
    RETURN jsonb_build_object(
      'success', true, 'already_checked_in', true, 'id', v_record.id,
      'classification', v_record.classification, 'checked_in_at', v_record.checked_in_at,
      'message', 'Anda sudah melakukan presensi hari ini.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'already_checked_in', false, 'id', v_record.id,
    'classification', v_record.classification, 'checked_in_at', v_record.checked_in_at,
    'message', 'Presensi mandiri berhasil dicatat tervalidasi jam server.'
  );
END;
$$;

REVOKE ALL ON FUNCTION app.attendance_check_in(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.attendance_check_in(uuid, jsonb) TO authenticated;

-- A coordinator may only inspect a team for which they have an active
-- membership. Elevated roles retain the ability to request the institution
-- aggregate or a selected team.
CREATE OR REPLACE FUNCTION app.analytics_operational_summary(
  p_from date,
  p_to date,
  p_team_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_scope_team uuid := p_team_id;
  v_population integer := 0;
  v_checked integer := 0;
  v_on_time integer := 0;
  v_grace integer := 0;
  v_late integer := 0;
  v_reports_total integer := 0;
  v_reports_submitted integer := 0;
  v_reports_late integer := 0;
  v_review_backlog integer := 0;
  v_tasks_open integer := 0;
  v_tasks_done integer := 0;
  v_tasks_overdue integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT app.has_any_role('super_admin', 'yayasan', 'pengurus', 'koordinator') THEN
    RAISE EXCEPTION 'Analytics tidak tersedia untuk peran ini';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RAISE EXCEPTION 'Rentang tanggal analytics tidak valid';
  END IF;
  IF app.has_role('koordinator') AND NOT app.has_any_role('super_admin', 'yayasan', 'pengurus') THEN
    IF v_scope_team IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = v_scope_team
        AND tm.user_id = auth.uid()
        AND tm.valid_from <= p_to
        AND (tm.valid_to IS NULL OR tm.valid_to >= p_from)
    ) THEN
      RAISE EXCEPTION 'Koordinator hanya dapat melihat analytics tim yang menjadi tanggung jawabnya';
    END IF;
  END IF;

  SELECT count(*) INTO v_population
  FROM public.profiles p
  WHERE p.status = 'active' AND p.member_type = 'santri'
    AND (v_scope_team IS NULL OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = p.id AND tm.team_id = v_scope_team
        AND tm.valid_from <= p_to AND (tm.valid_to IS NULL OR tm.valid_to >= p_from)
    ));

  SELECT count(*),
         count(*) FILTER (WHERE ar.classification = 'on_time'),
         count(*) FILTER (WHERE ar.classification = 'grace'),
         count(*) FILTER (WHERE ar.classification = 'late')
    INTO v_checked, v_on_time, v_grace, v_late
  FROM public.attendance_records ar
  JOIN public.profiles p ON p.id = ar.user_id
  WHERE ar.attendance_date BETWEEN p_from AND p_to
    AND (v_scope_team IS NULL OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = p.id AND tm.team_id = v_scope_team
        AND tm.valid_from <= ar.attendance_date AND (tm.valid_to IS NULL OR tm.valid_to >= ar.attendance_date)
    ));

  SELECT count(*),
         count(*) FILTER (WHERE dr.submission_status = 'submitted'),
         count(*) FILTER (WHERE dr.is_late),
         count(*) FILTER (WHERE dr.submission_status = 'submitted' AND dr.review_status IN ('not_reviewed', 'under_review'))
    INTO v_reports_total, v_reports_submitted, v_reports_late, v_review_backlog
  FROM public.daily_reports dr
  JOIN public.profiles p ON p.id = dr.user_id
  WHERE dr.report_date BETWEEN p_from AND p_to
    AND (v_scope_team IS NULL OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = p.id AND tm.team_id = v_scope_team
        AND tm.valid_from <= dr.report_date AND (tm.valid_to IS NULL OR tm.valid_to >= dr.report_date)
    ));

  SELECT count(*) FILTER (WHERE t.status IN ('todo', 'in_progress', 'in_review')),
         count(*) FILTER (WHERE t.status = 'done' AND t.completed_at::date BETWEEN p_from AND p_to),
         count(*) FILTER (WHERE t.status IN ('todo', 'in_progress', 'in_review') AND t.due_date < (now() AT TIME ZONE 'Asia/Jakarta')::date)
    INTO v_tasks_open, v_tasks_done, v_tasks_overdue
  FROM public.tasks t
  WHERE t.deleted_at IS NULL
    AND (v_scope_team IS NULL OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      JOIN public.team_members tm ON tm.user_id = ta.user_id AND tm.team_id = v_scope_team
      WHERE ta.task_id = t.id AND ta.unassigned_at IS NULL AND tm.valid_to IS NULL
    ));

  RETURN jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'attendance', jsonb_build_object('population', v_population, 'checked_in', v_checked, 'on_time', v_on_time, 'grace', v_grace, 'late', v_late),
    'reports', jsonb_build_object('total', v_reports_total, 'submitted', v_reports_submitted, 'late', v_reports_late, 'review_backlog', v_review_backlog),
    'tasks', jsonb_build_object('open', v_tasks_open, 'completed', v_tasks_done, 'overdue', v_tasks_overdue)
  );
END;
$$;

REVOKE ALL ON FUNCTION app.analytics_operational_summary(date, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.analytics_operational_summary(date, date, uuid) TO authenticated;
