-- Tighten direct API writes that must remain server-mediated.

-- Notifications are immutable except for the user's read marker.
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

-- A member may only create a pending attendance request. Approval metadata is
-- written by the reviewer RPC, never by the client payload.
DROP POLICY IF EXISTS "Active users can insert own exceptions" ON public.attendance_exceptions;
CREATE POLICY "Active users can insert own exceptions"
  ON public.attendance_exceptions FOR INSERT TO authenticated
  WITH CHECK (
    app.is_active_member()
    AND user_id = auth.uid()
    AND status = 'pending'::public.correction_status_type
    AND decided_by IS NULL
    AND decided_at IS NULL
  );

DROP POLICY IF EXISTS "Active users can create correction requests" ON public.attendance_corrections;
CREATE POLICY "Active users can create correction requests"
  ON public.attendance_corrections FOR INSERT TO authenticated
  WITH CHECK (
    app.is_active_member()
    AND user_id = auth.uid()
    AND status = 'pending'::public.correction_status_type
    AND reviewer_id IS NULL
    AND decided_at IS NULL
  );

-- Rebuild the audit chain from the actual computed hash, not from legacy hash
-- values that may have existed before the chain was introduced.
ALTER TABLE public.audit_logs DISABLE TRIGGER trg_audit_logs_append_only;
DO $$
DECLARE
  v_previous text := 'GENESIS';
  v_hash text;
  v_row record;
  v_canonical text;
BEGIN
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
    v_hash := 'sha256:' || encode(extensions.digest(v_canonical, 'sha256'), 'hex');
    UPDATE public.audit_logs
    SET previous_hash = v_previous, hash = v_hash
    WHERE id = v_row.id;
    v_previous := v_hash;
  END LOOP;
END $$;
ALTER TABLE public.audit_logs ENABLE TRIGGER trg_audit_logs_append_only;

-- Direct task updates must preserve the review gate as well as the RPC path.
CREATE OR REPLACE FUNCTION public.validate_task_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
BEGIN
  IF OLD.requires_review AND NOT NEW.requires_review AND OLD.status <> 'todo' THEN
    RAISE EXCEPTION 'Klausul review tidak dapat dihapus setelah tugas mulai dikerjakan.';
  END IF;

  IF NEW.status = 'done' AND OLD.requires_review AND NOT (
    OLD.status = 'in_review'
    AND (
      (auth.uid() IS NOT NULL AND (OLD.reviewer_id = auth.uid() OR app.has_any_role('super_admin', 'yayasan', 'pengurus')))
      OR (auth.uid() IS NULL AND current_user IN ('postgres', 'service_role'))
    )
  ) THEN
    RAISE EXCEPTION 'Tugas wajib review hanya dapat diselesaikan oleh reviewer atau administrator.';
  END IF;

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
