-- Notification inbox, audit hash-chain verification, and database-level
-- validation for operational dates and ranges.

-- 1. Durable in-app notifications ------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL DEFAULT '/',
  reference_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT notifications_title_length CHECK (length(trim(title)) BETWEEN 1 AND 200),
  CONSTRAINT notifications_body_length CHECK (length(trim(body)) BETWEEN 1 AND 5000)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe
  ON public.notifications(user_id, notification_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND app.is_active_member());
DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND app.is_active_member())
  WITH CHECK (user_id = auth.uid() AND app.is_active_member());
REVOKE INSERT, DELETE ON public.notifications FROM anon, authenticated;

-- 2. Real audit hash chain ---------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS previous_hash text;

CREATE INDEX IF NOT EXISTS idx_audit_logs_chain_order
  ON public.audit_logs(created_at ASC, id ASC);

CREATE OR REPLACE FUNCTION public.set_audit_log_chain_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, app, pg_temp
AS $$
DECLARE
  v_previous text;
  v_canonical text;
BEGIN
  -- Serialize inserts so concurrent server actions cannot fork the chain.
  PERFORM pg_advisory_xact_lock(hashtextextended('public.audit_logs.chain', 0));
  SELECT hash INTO v_previous
  FROM public.audit_logs
  WHERE hash IS NOT NULL
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  NEW.previous_hash := COALESCE(v_previous, 'GENESIS');
  v_canonical := concat_ws('|',
    NEW.previous_hash,
    COALESCE(NEW.id::text, ''),
    COALESCE(NEW.created_at::text, ''),
    COALESCE(NEW.actor_id::text, ''),
    COALESCE(NEW.event_name, ''),
    COALESCE(NEW.actor_name, ''),
    COALESCE(NEW.target_id, ''),
    COALESCE(NEW.target_label, ''),
    COALESCE(NEW.action_detail, ''),
    COALESCE(NEW.payload::text, '{}')
  );
  NEW.hash := 'sha256:' || encode(extensions.digest(v_canonical, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

-- Rebuild legacy rows into one deterministic chain before enabling the new
-- insert trigger. Existing append-only rows remain immutable after this step.
ALTER TABLE public.audit_logs DISABLE TRIGGER trg_audit_logs_append_only;
WITH ordered AS (
  SELECT id,
         lag(hash) OVER (ORDER BY created_at ASC, id ASC) AS prior_hash
  FROM public.audit_logs
), canonical AS (
  SELECT l.id,
         COALESCE(o.prior_hash, 'GENESIS') AS previous_hash,
         concat_ws('|',
           COALESCE(o.prior_hash, 'GENESIS'),
           l.id::text,
           l.created_at::text,
           COALESCE(l.actor_id::text, ''),
           COALESCE(l.event_name, ''),
           COALESCE(l.actor_name, ''),
           COALESCE(l.target_id, ''),
           COALESCE(l.target_label, ''),
           COALESCE(l.action_detail, ''),
           COALESCE(l.payload::text, '{}')
         ) AS value
  FROM public.audit_logs l
  JOIN ordered o ON o.id = l.id
)
UPDATE public.audit_logs l
SET previous_hash = c.previous_hash,
    hash = 'sha256:' || encode(extensions.digest(c.value, 'sha256'), 'hex')
FROM canonical c
WHERE l.id = c.id;
ALTER TABLE public.audit_logs ENABLE TRIGGER trg_audit_logs_append_only;

DROP TRIGGER IF EXISTS trg_audit_logs_chain_hash ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_chain_hash
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_log_chain_hash();

CREATE OR REPLACE FUNCTION app.verify_audit_chain()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, app, pg_temp
STABLE
AS $$
DECLARE
  v_row record;
  v_previous text := 'GENESIS';
  v_expected text;
  v_canonical text;
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT app.has_any_role('super_admin', 'yayasan', 'pengurus') THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Tidak memiliki akses memverifikasi audit chain.');
  END IF;
  FOR v_row IN
    SELECT * FROM public.audit_logs ORDER BY created_at ASC, id ASC
  LOOP
    v_canonical := concat_ws('|',
      v_previous,
      v_row.id::text,
      v_row.created_at::text,
      COALESCE(v_row.actor_id::text, ''),
      COALESCE(v_row.event_name, ''),
      COALESCE(v_row.actor_name, ''),
      COALESCE(v_row.target_id, ''),
      COALESCE(v_row.target_label, ''),
      COALESCE(v_row.action_detail, ''),
      COALESCE(v_row.payload::text, '{}')
    );
    v_expected := 'sha256:' || encode(extensions.digest(v_canonical, 'sha256'), 'hex');
    IF v_row.previous_hash IS DISTINCT FROM v_previous OR v_row.hash IS DISTINCT FROM v_expected THEN
      RETURN jsonb_build_object('valid', false, 'checked', v_count, 'failed_id', v_row.id, 'message', 'Audit chain tidak valid.');
    END IF;
    v_previous := v_row.hash;
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('valid', true, 'checked', v_count, 'message', 'Audit chain valid.');
END;
$$;
REVOKE ALL ON FUNCTION app.verify_audit_chain() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.verify_audit_chain() TO authenticated;

DROP POLICY IF EXISTS "Audit logs are viewable by authorized administrators" ON public.audit_logs;
CREATE POLICY "Audit logs are viewable by authorized administrators"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (app.is_active_member() AND app.has_any_role('super_admin', 'yayasan', 'pengurus'));

-- 3. Database-level validation for direct API/RPC bypasses ------------------
DO $$
BEGIN
  ALTER TABLE public.attendance_exceptions
    ADD CONSTRAINT attendance_exceptions_dates_check CHECK (date_to >= date_from),
    ADD CONSTRAINT attendance_exceptions_type_check CHECK (type IN ('excused', 'sick', 'duty'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_overlapping_attendance_exception()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
BEGIN
  IF NEW.status IN ('pending', 'approved') AND EXISTS (
    SELECT 1
    FROM public.attendance_exceptions e
    WHERE e.user_id = NEW.user_id
      AND e.id <> NEW.id
      AND e.status IN ('pending', 'approved')
      AND daterange(e.date_from, e.date_to, '[]') && daterange(NEW.date_from, NEW.date_to, '[]')
  ) THEN
    RAISE EXCEPTION 'Rentang izin bertumpang tindih dengan pengajuan aktif.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_overlapping_attendance_exception ON public.attendance_exceptions;
CREATE TRIGGER trg_prevent_overlapping_attendance_exception
  BEFORE INSERT OR UPDATE OF user_id, date_from, date_to, status
  ON public.attendance_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_overlapping_attendance_exception();

CREATE OR REPLACE FUNCTION public.validate_daily_report_operational_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.user_id = auth.uid()
     AND NOT app.has_any_role('super_admin', 'yayasan', 'pengurus')
     AND NEW.report_date <> (now() AT TIME ZONE 'Asia/Jakarta')::date THEN
    RAISE EXCEPTION 'Laporan hanya dapat disimpan untuk tanggal operasional hari ini.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_daily_report_operational_date ON public.daily_reports;
CREATE TRIGGER trg_validate_daily_report_operational_date
  BEFORE INSERT OR UPDATE OF user_id, report_date
  ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_daily_report_operational_date();

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_time_range_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_time_range_check CHECK (ends_at > starts_at);

-- Enforce only the intended state transitions for tasks at the database edge.
CREATE OR REPLACE FUNCTION public.validate_task_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF (OLD.status, NEW.status) NOT IN (
    ('todo', 'in_progress'), ('todo', 'cancelled'),
    ('in_progress', 'todo'), ('in_progress', 'in_review'), ('in_progress', 'done'), ('in_progress', 'cancelled'),
    ('in_review', 'in_progress'), ('in_review', 'done'), ('in_review', 'cancelled'),
    ('done', 'in_progress'), ('cancelled', 'todo')
  ) AND NOT (OLD.status = 'todo' AND NEW.status = 'done' AND NEW.requires_review = false) THEN
    RAISE EXCEPTION 'Transisi tugas % ke % tidak diizinkan.', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_task_transition ON public.tasks;
CREATE TRIGGER trg_validate_task_transition
  BEFORE UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_task_transition();
