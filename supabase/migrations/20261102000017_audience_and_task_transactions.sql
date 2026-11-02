-- Centralize audience matching and make task creation atomic.

CREATE OR REPLACE FUNCTION app.can_view_audience_for_user(
  p_config jsonb,
  p_team_id text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
STABLE
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_scope text := COALESCE(p_config->>'scope', 'all');
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR v_profile.status <> 'active' THEN RETURN false; END IF;

  IF v_scope = 'users' THEN
    RETURN COALESCE(p_config->'userIds' ? p_user_id::text, false);
  ELSIF v_scope = 'member_type' THEN
    RETURN COALESCE(p_config->'memberTypes' ? COALESCE(v_profile.member_type, 'santri'), false);
  ELSIF v_scope = 'team' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = p_user_id
        AND tm.valid_to IS NULL
        AND (
          p_config->'teamIds' ? tm.team_id::text
          OR p_config->'teamIds' ? t.slug
          OR p_config->'teamIds' ? t.name
        )
    );
  END IF;

  -- "all" still respects an explicit event/announcement team owner.
  IF p_team_id IS NULL OR p_team_id = v_profile.team_name THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = p_user_id
      AND tm.valid_to IS NULL
      AND (p_team_id = tm.team_id::text OR p_team_id = t.slug OR p_team_id = t.name)
  );
END;
$$;

REVOKE ALL ON FUNCTION app.can_view_audience_for_user(jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.can_view_audience_for_user(jsonb, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION app.can_view_audience(
  p_config jsonb,
  p_team_id text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app, pg_temp
STABLE
AS $$
  SELECT app.can_view_audience_for_user(p_config, p_team_id, p_user_id);
$$;

REVOKE ALL ON FUNCTION app.can_view_audience(jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.can_view_audience(jsonb, text, uuid) TO authenticated;

-- The task and its assignees are created in one transaction. The caller can
-- retry safely without leaving a task row behind when an assignee is invalid.
CREATE OR REPLACE FUNCTION app.create_task(
  p_title text,
  p_description text DEFAULT '',
  p_priority text DEFAULT 'normal',
  p_requires_review boolean DEFAULT false,
  p_project_id uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_visibility text DEFAULT 'team',
  p_assignee_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_task_id uuid;
  v_assignees uuid[] := ARRAY(SELECT DISTINCT unnest(COALESCE(p_assignee_ids, '{}'::uuid[])));
BEGIN
  IF auth.uid() IS NULL OR NOT app.is_active_member() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sesi tidak valid atau akun tidak aktif.');
  END IF;
  IF length(trim(COALESCE(p_title, ''))) NOT BETWEEN 1 AND 200 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Judul tugas wajib diisi dan maksimal 200 karakter.');
  END IF;
  IF length(COALESCE(p_description, '')) > 5000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Deskripsi tugas maksimal 5.000 karakter.');
  END IF;
  IF p_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Prioritas tugas tidak valid.');
  END IF;
  IF p_visibility NOT IN ('private', 'team', 'organization') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Visibilitas tugas tidak valid.');
  END IF;
  IF p_project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_project_id AND status <> 'archived'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Proyek tugas tidak ditemukan atau sudah diarsipkan.');
  END IF;
  IF COALESCE(array_length(v_assignees, 1), 0) > 0 AND EXISTS (
    SELECT 1 FROM unnest(v_assignees) AS ids(id)
    LEFT JOIN public.profiles p ON p.id = ids.id
    WHERE p.id IS NULL OR p.status <> 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Salah satu penanggung jawab tidak aktif atau tidak ditemukan.');
  END IF;

  INSERT INTO public.tasks (
    project_id, title, description, priority, status, requires_review,
    due_date, visibility, created_by
  ) VALUES (
    p_project_id, trim(p_title), COALESCE(p_description, ''), p_priority,
    'todo', COALESCE(p_requires_review, false), p_due_date, p_visibility, auth.uid()
  ) RETURNING id INTO v_task_id;

  IF COALESCE(array_length(v_assignees, 1), 0) > 0 THEN
    INSERT INTO public.task_assignees (task_id, user_id, assigned_by)
    SELECT v_task_id, ids.id, auth.uid()
    FROM unnest(v_assignees) AS ids(id);
  END IF;

  RETURN jsonb_build_object('success', true, 'task_id', v_task_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION app.create_task(text, text, text, boolean, uuid, date, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.create_task(text, text, text, boolean, uuid, date, text, uuid[]) TO authenticated;
