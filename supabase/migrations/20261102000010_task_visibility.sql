-- Task visibility: personal tasks must not leak across accounts or teams.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'team';

DO $$
BEGIN
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_visibility_check CHECK (visibility IN ('private', 'team', 'organization'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_visibility ON public.tasks(visibility, deleted_at);

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
