-- Atomic reviewer assignment replacement.
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
