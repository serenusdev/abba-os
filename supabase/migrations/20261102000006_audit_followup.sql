-- Follow-up for audit findings that need a second, immutable database transaction.

-- Resolve report category slugs to their real UUIDs and keep a snapshot before
-- replacing report items during a revision.
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
  v_existing public.daily_reports%ROWTYPE;
  v_now timestamptz := now();
  v_item jsonb;
  v_index integer := 0;
  v_category_id uuid;
  v_snapshot jsonb;
  v_duration integer;
  v_category_key text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id OR NOT app.is_active_member() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki akses ke laporan ini.');
  END IF;
  IF p_submission_status NOT IN ('draft', 'submitted') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status laporan tidak valid.');
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Laporan wajib memiliki minimal 1 item.');
  END IF;

  SELECT * INTO v_existing
  FROM public.daily_reports
  WHERE user_id = p_user_id AND report_date = p_report_date
  FOR UPDATE;

  IF FOUND AND v_existing.review_status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Laporan yang sudah disetujui tidak dapat diubah.');
  END IF;

  IF FOUND THEN
    SELECT jsonb_agg(to_jsonb(ri) ORDER BY ri.sort_order) INTO v_snapshot
    FROM public.report_items ri
    WHERE ri.report_id = v_existing.id;
    IF v_snapshot IS NOT NULL THEN
      INSERT INTO public.report_revisions (report_id, revision_no, snapshot_items, submitted_at, submitted_by)
      VALUES (v_existing.id, v_existing.revision_no, v_snapshot, v_now, p_user_id);
    END IF;
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
    v_category_id := NULL;
    v_category_key := NULLIF(trim(v_item->>'categoryId'), '');
    IF v_category_key IS NOT NULL THEN
      IF v_category_key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        SELECT id INTO v_category_id FROM public.report_categories WHERE id = v_category_key::uuid;
      ELSE
        SELECT id INTO v_category_id FROM public.report_categories WHERE slug = v_category_key AND is_active = true;
      END IF;
    END IF;
    v_duration := CASE
      WHEN COALESCE(v_item->>'durationMinutes', '') ~ '^\\d+$' THEN (v_item->>'durationMinutes')::integer
      ELSE 60
    END;
    INSERT INTO public.report_items (
      report_id, category_id, title, description, result_progress,
      obstacles, duration_minutes, sort_order
    ) VALUES (
      v_report.id,
      v_category_id,
      COALESCE(NULLIF(v_item->>'title', ''), 'Aktivitas ' || v_index),
      COALESCE(v_item->>'description', ''),
      NULLIF(v_item->>'resultProgress', ''),
      NULLIF(v_item->>'obstacles', ''),
      v_duration,
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

-- Review is one transaction: lock the report, verify assignment, append the
-- immutable decision, and update the report status together.
CREATE OR REPLACE FUNCTION app.review_report(
  p_report_id uuid,
  p_decision text,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_report public.daily_reports%ROWTYPE;
  v_elevated boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT app.is_active_member() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sesi tidak valid atau akun tidak aktif.');
  END IF;
  IF p_decision NOT IN ('approved', 'revision_required') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Keputusan review tidak valid.');
  END IF;
  IF p_decision = 'revision_required' AND length(trim(COALESCE(p_notes, ''))) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Catatan revisi wajib diisi.');
  END IF;

  SELECT * INTO v_report
  FROM public.daily_reports
  WHERE id = p_report_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Laporan santri tidak ditemukan.');
  END IF;
  IF v_report.user_id = auth.uid() AND NOT app.has_role('super_admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak dapat meninjau laporan sendiri.');
  END IF;
  IF v_report.submission_status <> 'submitted' OR v_report.review_status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Laporan tidak berada pada status yang dapat direview.');
  END IF;

  v_elevated := app.has_any_role('super_admin', 'yayasan', 'pengurus');
  IF NOT v_elevated AND NOT EXISTS (
    SELECT 1 FROM public.reviewer_assignments ra
    WHERE ra.reviewee_id = v_report.user_id
      AND ra.reviewer_id = auth.uid()
      AND ra.kind = 'report'
      AND ra.valid_from <= CURRENT_DATE
      AND (ra.valid_to IS NULL OR ra.valid_to >= CURRENT_DATE)
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda belum ditetapkan sebagai reviewer laporan ini.');
  END IF;

  INSERT INTO public.report_reviews (report_id, revision_no, reviewer_id, decision, notes, decided_at)
  VALUES (v_report.id, v_report.revision_no, auth.uid(), p_decision, COALESCE(p_notes, ''), now());

  UPDATE public.daily_reports
  SET review_status = p_decision,
      reviewer_id = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = v_report.id;

  RETURN jsonb_build_object('success', true, 'message', 'Review laporan berhasil disimpan.', 'user_id', v_report.user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION app.review_report(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.review_report(uuid, text, text) TO authenticated;
