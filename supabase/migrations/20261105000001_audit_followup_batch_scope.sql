-- Audit follow-up: make member import state transitions explicit and keep
-- server-side task access aligned with the visibility model.

ALTER TABLE public.member_import_batches
  DROP CONSTRAINT IF EXISTS member_import_batches_status_check;

ALTER TABLE public.member_import_batches
  ADD CONSTRAINT member_import_batches_status_check
  CHECK (status IN ('validated', 'processing', 'completed', 'failed'));

COMMENT ON COLUMN public.member_import_batches.status IS
  'validated before provisioning, processing during Auth/request writes, completed only after all writes, or failed after rollback/cleanup.';

CREATE OR REPLACE FUNCTION app.can_access_task(p_task_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app, pg_temp
STABLE
AS $$
  SELECT app.is_active_member() AND EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = p_task_id
      AND t.deleted_at IS NULL
      AND (
        t.created_by = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.task_assignees ta
          WHERE ta.task_id = t.id AND ta.user_id = p_user_id AND ta.unassigned_at IS NULL
        )
        OR app.has_any_role('super_admin', 'yayasan', 'pengurus')
        OR (t.visibility = 'organization' AND app.has_any_role('koordinator', 'santri'))
        OR (
          t.visibility = 'team' AND EXISTS (
            SELECT 1
            FROM public.team_members tm
            JOIN public.teams team ON team.id = tm.team_id
            WHERE tm.user_id = p_user_id
              AND tm.valid_to IS NULL
              AND (t.team_id = team.id::text OR t.team_id = team.slug OR t.team_id = team.name)
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION app.can_access_task(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.can_access_task(uuid, uuid) TO authenticated;
