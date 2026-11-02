-- Close duplicate-active membership and reviewer assignment races while
-- preserving historical rows.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY team_id, user_id ORDER BY created_at DESC, id DESC) AS position
  FROM public.team_members
  WHERE valid_to IS NULL
)
UPDATE public.team_members tm
SET valid_to = CURRENT_DATE
FROM ranked r
WHERE tm.id = r.id AND r.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_one_active_membership
  ON public.team_members(team_id, user_id)
  WHERE valid_to IS NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY reviewee_id, kind ORDER BY created_at DESC, id DESC) AS position
  FROM public.reviewer_assignments
  WHERE valid_to IS NULL
)
UPDATE public.reviewer_assignments ra
SET valid_to = CURRENT_DATE
FROM ranked r
WHERE ra.id = r.id AND r.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviewer_assignments_one_active
  ON public.reviewer_assignments(reviewee_id, kind)
  WHERE valid_to IS NULL;

CREATE OR REPLACE FUNCTION app.assign_reviewer(
  p_reviewee_id uuid,
  p_reviewer_id uuid,
  p_kind text DEFAULT 'report',
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT app.has_any_role('super_admin', 'pengurus') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki akses menetapkan reviewer.');
  END IF;
  IF p_reviewee_id = p_reviewer_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anggota tidak dapat menjadi reviewer dirinya sendiri.');
  END IF;
  IF p_kind NOT IN ('report', 'attendance_correction', 'task') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Jenis reviewer tidak valid.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_reviewee_id AND status = 'active')
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_reviewer_id AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reviewee dan reviewer harus merupakan akun aktif.');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_reviewee_id::text || ':' || p_kind, 0));
  UPDATE public.reviewer_assignments
  SET valid_to = CURRENT_DATE
  WHERE reviewee_id = p_reviewee_id AND kind = p_kind AND valid_to IS NULL;
  INSERT INTO public.reviewer_assignments (reviewee_id, reviewer_id, kind, reason, valid_from)
  VALUES (p_reviewee_id, p_reviewer_id, p_kind, NULLIF(trim(p_reason), ''), CURRENT_DATE);
  RETURN jsonb_build_object('success', true, 'message', 'Reviewer berhasil ditetapkan secara atomik.');
END;
$$;

REVOKE ALL ON FUNCTION app.assign_reviewer(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.assign_reviewer(uuid, uuid, text, text) TO authenticated;
