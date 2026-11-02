-- Pondok OS — Operations expansion
-- Analytics drill-down, member import, task collaboration, granular audiences,
-- two-stage policy approval, and backup run tracking.

-- 1. Task collaboration ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_created
  ON public.task_comments(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task
  ON public.task_attachments(task_id, created_at DESC);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Task comments are readable by authenticated users" ON public.task_comments;
CREATE POLICY "Task comments are readable by authenticated users"
  ON public.task_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can add task comments" ON public.task_comments;
CREATE POLICY "Users can add task comments"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
DROP POLICY IF EXISTS "Authors can edit task comments" ON public.task_comments;
CREATE POLICY "Authors can edit task comments"
  ON public.task_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Task attachments are readable by authenticated users" ON public.task_attachments;
CREATE POLICY "Task attachments are readable by authenticated users"
  ON public.task_attachments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can add task attachments" ON public.task_attachments;
CREATE POLICY "Users can add task attachments"
  ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
DROP POLICY IF EXISTS "Owners can delete task attachments" ON public.task_attachments;
CREATE POLICY "Owners can delete task attachments"
  ON public.task_attachments FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR app.has_any_role('super_admin', 'pengurus'));

DROP POLICY IF EXISTS "Task mentions are readable by authenticated users" ON public.task_mentions;
CREATE POLICY "Task mentions are readable by authenticated users"
  ON public.task_mentions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Comment authors can add task mentions" ON public.task_mentions;
CREATE POLICY "Comment authors can add task mentions"
  ON public.task_mentions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_comments c
    WHERE c.id = comment_id AND c.author_id = auth.uid()
  ));

-- Supabase Storage is private; the application returns short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Granular audience configuration ----------------------------------------
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS audience_config jsonb NOT NULL DEFAULT '{"scope":"all"}'::jsonb;
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS audience_config jsonb NOT NULL DEFAULT '{"scope":"all"}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_announcements_audience_config
  ON public.announcements USING gin (audience_config);
CREATE INDEX IF NOT EXISTS idx_events_audience_config
  ON public.events USING gin (audience_config);

-- 3. Versioned, two-stage policy approval ------------------------------------
ALTER TABLE public.policy_settings
  ADD COLUMN IF NOT EXISTS proposed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS change_reason text;

CREATE TABLE IF NOT EXISTS public.policy_approval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id text NOT NULL REFERENCES public.policy_settings(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status text NOT NULL,
  to_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_approval_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authorized users can read policy approval events" ON public.policy_approval_events;
CREATE POLICY "Authorized users can read policy approval events"
  ON public.policy_approval_events FOR SELECT TO authenticated
  USING (app.has_any_role('super_admin', 'yayasan', 'pengurus'));

-- 4. Import and backup run bookkeeping ---------------------------------------
CREATE TABLE IF NOT EXISTS public.member_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  rejected_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('validated', 'completed', 'failed')),
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL CHECK (run_type IN ('database', 'storage', 'restore_test')),
  status text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  artifact_ref text,
  row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.member_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view member import batches" ON public.member_import_batches;
CREATE POLICY "Admins can view member import batches"
  ON public.member_import_batches FOR SELECT TO authenticated
  USING (app.has_any_role('super_admin', 'pengurus'));
DROP POLICY IF EXISTS "Super admins can view backup runs" ON public.backup_runs;
CREATE POLICY "Super admins can view backup runs"
  ON public.backup_runs FOR SELECT TO authenticated
  USING (app.has_any_role('super_admin'));

-- 5. Source-of-truth analytics RPC -------------------------------------------
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

  SELECT count(*) INTO v_population
  FROM public.profiles p
  WHERE p.status = 'active' AND p.member_type = 'santri'
    AND (p_team_id IS NULL OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = p.id AND tm.team_id = p_team_id
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
    AND (p_team_id IS NULL OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = p.id AND tm.team_id = p_team_id
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
    AND (p_team_id IS NULL OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = p.id AND tm.team_id = p_team_id
        AND tm.valid_from <= dr.report_date AND (tm.valid_to IS NULL OR tm.valid_to >= dr.report_date)
    ));

  SELECT count(*) FILTER (WHERE t.status IN ('todo', 'in_progress', 'in_review')),
         count(*) FILTER (WHERE t.status = 'done' AND t.completed_at::date BETWEEN p_from AND p_to),
         count(*) FILTER (WHERE t.status IN ('todo', 'in_progress', 'in_review') AND t.due_date < (now() AT TIME ZONE 'Asia/Jakarta')::date)
    INTO v_tasks_open, v_tasks_done, v_tasks_overdue
  FROM public.tasks t
  WHERE t.deleted_at IS NULL
    AND (p_team_id IS NULL OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      JOIN public.team_members tm ON tm.user_id = ta.user_id AND tm.team_id = p_team_id
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
