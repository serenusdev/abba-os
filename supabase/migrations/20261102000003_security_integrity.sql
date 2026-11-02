-- Security, privacy, and data-integrity hardening for the audit findings.

-- Private calendar subscriptions keep only a hash of the bearer token.
CREATE TABLE IF NOT EXISTS public.calendar_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_subscriptions_user
  ON public.calendar_subscriptions(user_id, created_at DESC);

ALTER TABLE public.calendar_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own calendar subscriptions"
  ON public.calendar_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can revoke own calendar subscriptions"
  ON public.calendar_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Keep private contact data out of direct client reads. Server actions use the
-- service-role client only after resolving the caller's server session.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, email, full_name, avatar_url, status, member_type, team_name, created_at, updated_at)
  ON public.profiles TO authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone_number, avatar_url, notes, updated_at)
  ON public.profiles TO authenticated;

-- A report draft/submit is one transaction: report row and all items change
-- together, so a failed item insert cannot leave an empty report behind.
CREATE OR REPLACE FUNCTION app.save_report(
  p_user_id uuid,
  p_report_date date,
  p_submission_status text,
  p_is_late boolean,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_report public.daily_reports%ROWTYPE;
  v_now timestamptz := now();
  v_item jsonb;
  v_index integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki akses ke laporan ini.');
  END IF;
  IF p_submission_status NOT IN ('draft', 'submitted') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status laporan tidak valid.');
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Laporan wajib memiliki minimal 1 item.');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.daily_reports
    WHERE user_id = p_user_id AND report_date = p_report_date AND review_status = 'approved'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Laporan yang sudah disetujui tidak dapat diubah.');
  END IF;

  INSERT INTO public.daily_reports (
    user_id, report_date, submission_status, is_late,
    first_submitted_at, last_submitted_at, review_status, updated_at
  ) VALUES (
    p_user_id, p_report_date, p_submission_status, p_is_late,
    CASE WHEN p_submission_status = 'submitted' THEN v_now ELSE NULL END,
    CASE WHEN p_submission_status = 'submitted' THEN v_now ELSE NULL END,
    'not_reviewed', v_now
  )
  ON CONFLICT (user_id, report_date) DO UPDATE SET
    submission_status = EXCLUDED.submission_status,
    is_late = CASE WHEN public.daily_reports.first_submitted_at IS NULL
                   THEN EXCLUDED.is_late ELSE public.daily_reports.is_late END,
    first_submitted_at = COALESCE(public.daily_reports.first_submitted_at, EXCLUDED.first_submitted_at),
    last_submitted_at = CASE WHEN EXCLUDED.submission_status = 'submitted'
                             THEN EXCLUDED.last_submitted_at
                             ELSE public.daily_reports.last_submitted_at END,
    review_status = CASE WHEN EXCLUDED.submission_status = 'submitted'
                         THEN 'not_reviewed' ELSE public.daily_reports.review_status END,
    revision_no = CASE WHEN EXCLUDED.submission_status = 'submitted'
                       THEN public.daily_reports.revision_no + 1
                       ELSE public.daily_reports.revision_no END,
    updated_at = v_now
  RETURNING * INTO v_report;

  DELETE FROM public.report_items WHERE report_id = v_report.id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_index := v_index + 1;
    INSERT INTO public.report_items (
      report_id, category_id, title, description, result_progress,
      obstacles, duration_minutes, sort_order
    ) VALUES (
      v_report.id,
      CASE
        WHEN v_item->>'categoryId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN (v_item->>'categoryId')::uuid
        ELSE NULL
      END,
      COALESCE(NULLIF(v_item->>'title', ''), 'Aktivitas ' || v_index),
      COALESCE(v_item->>'description', ''),
      NULLIF(v_item->>'resultProgress', ''),
      NULLIF(v_item->>'obstacles', ''),
      COALESCE(NULLIF(v_item->>'durationMinutes', '')::integer, 60),
      v_index
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'report_id', v_report.id, 'revision_no', v_report.revision_no);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION app.save_report(uuid, date, text, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.save_report(uuid, date, text, boolean, jsonb) TO authenticated;

-- Server-authoritative attendance: policy is required, Sunday is rejected, and
-- the unique constraint plus DO NOTHING prevents a second check-in overwriting
-- the original timestamp.
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
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'message', 'Sesi tidak valid.');
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

-- Task transition RPC must not trust a caller-supplied user id.
CREATE OR REPLACE FUNCTION app.task_transition(
  p_task_id uuid,
  p_new_status text,
  p_user_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_now timestamptz := now();
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sesi tidak valid.');
  END IF;
  IF p_new_status NOT IN ('todo', 'in_progress', 'in_review', 'done', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tugas tidak valid.');
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tugas tidak ditemukan.');
  END IF;

  v_allowed := v_task.created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = p_task_id AND ta.user_id = auth.uid() AND ta.unassigned_at IS NULL)
    OR app.has_any_role('super_admin', 'yayasan', 'pengurus', 'koordinator');
  IF NOT v_allowed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki akses untuk mengubah tugas ini.');
  END IF;
  IF p_new_status = 'done' AND v_task.requires_review AND v_task.status <> 'in_review' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tugas ini memerlukan review sebelum selesai.');
  END IF;
  IF v_task.status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'new_status', p_new_status, 'message', 'Status tugas sudah sesuai.');
  END IF;

  UPDATE public.tasks SET
    status = p_new_status,
    completed_at = CASE WHEN p_new_status = 'done' THEN v_now ELSE NULL END,
    updated_at = v_now
  WHERE id = p_task_id;
  INSERT INTO public.task_status_history (task_id, from_status, to_status, changed_by, changed_at, note)
  VALUES (p_task_id, v_task.status, p_new_status, auth.uid(), v_now, p_note);
  RETURN jsonb_build_object('success', true, 'new_status', p_new_status, 'message', 'Status tugas berhasil diperbarui.');
END;
$$;

REVOKE ALL ON FUNCTION app.task_transition(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.task_transition(uuid, text, uuid, text) TO authenticated;

-- Protect the pre-existing report submit helper even though the application
-- now uses app.save_report for atomic writes.
REVOKE ALL ON FUNCTION app.report_submit(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.report_submit(uuid, uuid) FROM authenticated;

-- The coordinator RPC is callable only from an authenticated, authorized
-- session. The action invokes it through the user's Supabase client.
CREATE OR REPLACE FUNCTION app.team_set_coordinator(
  p_team_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_now date := CURRENT_DATE;
BEGIN
  IF auth.uid() IS NULL OR NOT app.has_any_role('super_admin', 'pengurus') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki akses mengatur koordinator.');
  END IF;
  UPDATE public.team_members
  SET valid_to = v_now, team_role = 'member'
  WHERE team_id = p_team_id AND team_role = 'coordinator' AND valid_to IS NULL;
  IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team_id AND user_id = p_user_id) THEN
    UPDATE public.team_members
    SET team_role = 'coordinator', valid_to = NULL
    WHERE team_id = p_team_id AND user_id = p_user_id;
  ELSE
    INSERT INTO public.team_members (team_id, user_id, team_role, valid_from)
    VALUES (p_team_id, p_user_id, 'coordinator', v_now);
  END IF;
  RETURN jsonb_build_object('success', true, 'message', 'Koordinator tim berhasil diperbarui secara atomik.');
END;
$$;

REVOKE ALL ON FUNCTION app.team_set_coordinator(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.team_set_coordinator(uuid, uuid) TO authenticated;

-- Audit logs are append-only at the database boundary as well as in server code.
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_policy
  ON public.policy_settings(status)
  WHERE status = 'active';

-- Small durable rate limiter for public registration and other sensitive
-- server actions. It avoids relying on process-local memory in serverless
-- deployments.
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  hit_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bucket public.rate_limit_buckets%ROWTYPE;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 OR length(p_key) = 0 THEN
    RETURN false;
  END IF;
  SELECT * INTO v_bucket FROM public.rate_limit_buckets WHERE key = p_key FOR UPDATE;
  IF NOT FOUND OR v_bucket.window_started_at + make_interval(secs => p_window_seconds) <= now() THEN
    INSERT INTO public.rate_limit_buckets(key, window_started_at, hit_count, updated_at)
    VALUES (p_key, now(), 1, now())
    ON CONFLICT (key) DO UPDATE SET window_started_at = now(), hit_count = 1, updated_at = now();
    RETURN true;
  END IF;
  IF v_bucket.hit_count >= p_limit THEN
    UPDATE public.rate_limit_buckets SET updated_at = now() WHERE key = p_key;
    RETURN false;
  END IF;
  UPDATE public.rate_limit_buckets SET hit_count = hit_count + 1, updated_at = now() WHERE key = p_key;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
