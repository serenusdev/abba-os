-- Audit hardening: authorization, audience isolation, active-account checks,
-- atomic role/team safeguards, and server-owned sensitive state.

-- Canonical roles must always belong to an active application profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS session_revoked_at timestamptz;
CREATE OR REPLACE FUNCTION app.has_role(role_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app, pg_temp
STABLE
AS $$
  SELECT app.is_active_member() AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.revoked_at IS NULL
      AND r.key = role_key
  );
$$;

CREATE OR REPLACE FUNCTION app.has_any_role(VARIADIC role_keys text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app, pg_temp
STABLE
AS $$
  SELECT app.is_active_member() AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.revoked_at IS NULL
      AND r.key = ANY(role_keys)
  );
$$;

-- Keep active role grants unique while retaining revoked history.
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.role_id = b.role_id
  AND a.revoked_at IS NULL
  AND b.revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_one_active_grant
  ON public.user_roles(user_id, role_id)
  WHERE revoked_at IS NULL;

-- Explicit role-permission mapping for the canonical application roles.
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'global'::public.scope_type_enum
FROM public.roles r
JOIN public.permissions p ON p.key IN (
  'iam.account.request.read', 'iam.account.decide', 'iam.account.suspend',
  'iam.role.assign', 'iam.user.read', 'iam.audit.read', 'iam.session.revoke'
)
WHERE r.key = 'super_admin'
ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'global'::public.scope_type_enum
FROM public.roles r
JOIN public.permissions p ON p.key IN (
  'iam.account.request.read', 'iam.account.decide', 'iam.user.read'
)
WHERE r.key = 'pengurus'
ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'global'::public.scope_type_enum
FROM public.roles r
JOIN public.permissions p ON p.key IN ('iam.account.request.read', 'iam.user.read')
WHERE r.key = 'yayasan'
ON CONFLICT DO NOTHING;

-- Task access is derived from the task's owner, active assignees, team
-- membership, or an elevated canonical role. It is reused by every child
-- table so comments and attachments cannot widen task visibility.
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
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          JOIN public.teams team ON team.id = tm.team_id
          WHERE tm.user_id = p_user_id
            AND tm.valid_to IS NULL
            AND (
              t.team_id = team.id::text OR t.team_id = team.slug OR t.team_id = team.name
            )
        )
      )
  );
$$;

-- Remove broad task child policies from earlier migrations.
DROP POLICY IF EXISTS "Checklist items viewable by authenticated users" ON public.task_checklist_items;
DROP POLICY IF EXISTS "Task history readable by authenticated users" ON public.task_status_history;
DROP POLICY IF EXISTS "Projects are readable by authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Task assignees can update assigned tasks" ON public.tasks;
CREATE POLICY "Users can view accessible projects"
  ON public.projects FOR SELECT TO authenticated
  USING (
    app.is_active_member() AND (
      owner_id = auth.uid() OR created_by = auth.uid() OR
      app.has_any_role('super_admin', 'yayasan', 'pengurus') OR
      EXISTS (
        SELECT 1 FROM public.team_members tm JOIN public.teams team ON team.id = tm.team_id
        WHERE tm.user_id = auth.uid() AND tm.valid_to IS NULL
          AND (projects.team_id = team.id::text OR projects.team_id = team.slug OR projects.team_id = team.name)
      )
    )
  );
CREATE POLICY "Users can view accessible tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (app.can_access_task(id));
CREATE POLICY "Task participants can update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (app.can_access_task(id))
  WITH CHECK (app.can_access_task(id));
CREATE POLICY "Task participants can view checklist"
  ON public.task_checklist_items FOR SELECT TO authenticated
  USING (app.can_access_task(task_id));
CREATE POLICY "Task participants can manage checklist"
  ON public.task_checklist_items FOR INSERT TO authenticated
  WITH CHECK (app.can_access_task(task_id));
CREATE POLICY "Task participants can update checklist"
  ON public.task_checklist_items FOR UPDATE TO authenticated
  USING (app.can_access_task(task_id)) WITH CHECK (app.can_access_task(task_id));
CREATE POLICY "Task participants can delete checklist"
  ON public.task_checklist_items FOR DELETE TO authenticated
  USING (app.can_access_task(task_id));
CREATE POLICY "Users can view accessible task history"
  ON public.task_status_history FOR SELECT TO authenticated
  USING (app.can_access_task(task_id));

DROP POLICY IF EXISTS "Task comments are readable by authenticated users" ON public.task_comments;
DROP POLICY IF EXISTS "Users can add task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Authors can edit task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Task attachments are readable by authenticated users" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can add task attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Owners can delete task attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Task mentions are readable by authenticated users" ON public.task_mentions;
DROP POLICY IF EXISTS "Comment authors can add task mentions" ON public.task_mentions;
CREATE POLICY "Task participants can view comments"
  ON public.task_comments FOR SELECT TO authenticated USING (app.can_access_task(task_id));
CREATE POLICY "Task participants can add comments"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND app.can_access_task(task_id));
CREATE POLICY "Authors can edit accessible comments"
  ON public.task_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND app.can_access_task(task_id))
  WITH CHECK (author_id = auth.uid() AND app.can_access_task(task_id));
CREATE POLICY "Task participants can view attachments"
  ON public.task_attachments FOR SELECT TO authenticated USING (app.can_access_task(task_id));
CREATE POLICY "Task participants can add attachments"
  ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND app.can_access_task(task_id));
CREATE POLICY "Attachment owners can delete accessible attachments"
  ON public.task_attachments FOR DELETE TO authenticated
  USING ((uploaded_by = auth.uid() OR app.has_any_role('super_admin', 'pengurus')) AND app.can_access_task(task_id));
CREATE POLICY "Task participants can view mentions"
  ON public.task_mentions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.task_comments c WHERE c.id = comment_id AND app.can_access_task(c.task_id)));
CREATE POLICY "Comment authors can add accessible mentions"
  ON public.task_mentions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_comments c
    WHERE c.id = comment_id AND c.author_id = auth.uid() AND app.can_access_task(c.task_id)
  ));

-- Reports: owners may write content, but never review metadata directly.
CREATE OR REPLACE FUNCTION app.protect_report_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
BEGIN
  IF current_user = 'authenticated' AND OLD.user_id = auth.uid() AND NOT app.has_any_role('super_admin', 'yayasan', 'pengurus') THEN
    IF NEW.review_status IS DISTINCT FROM OLD.review_status
       OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
       OR NEW.is_late IS DISTINCT FROM OLD.is_late
       OR NEW.first_submitted_at IS DISTINCT FROM OLD.first_submitted_at THEN
      RAISE EXCEPTION 'Review metadata hanya dapat diubah melalui alur review resmi';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_report_review_fields ON public.daily_reports;
CREATE TRIGGER trg_protect_report_review_fields
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION app.protect_report_review_fields();

CREATE OR REPLACE FUNCTION app.reject_inactive_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT app.is_active_member() THEN
    RAISE EXCEPTION 'Akun tidak aktif tidak dapat mengubah data operasional';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_reject_inactive_daily_reports ON public.daily_reports;
CREATE TRIGGER trg_reject_inactive_daily_reports
  BEFORE INSERT OR UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION app.reject_inactive_mutation();
DROP TRIGGER IF EXISTS trg_reject_inactive_attendance_records ON public.attendance_records;
CREATE TRIGGER trg_reject_inactive_attendance_records
  BEFORE INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION app.reject_inactive_mutation();

DROP POLICY IF EXISTS "Users can manage own daily reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Reviewers can view assigned or unassigned reports" ON public.daily_reports;
CREATE POLICY "Users can create own daily report"
  ON public.daily_reports FOR INSERT TO authenticated
  WITH CHECK (app.is_active_member() AND auth.uid() = user_id);
CREATE POLICY "Users can update own report content"
  ON public.daily_reports FOR UPDATE TO authenticated
  USING (app.is_active_member() AND auth.uid() = user_id)
  WITH CHECK (app.is_active_member() AND auth.uid() = user_id);
CREATE POLICY "Users and assigned reviewers can view reports"
  ON public.daily_reports FOR SELECT TO authenticated
  USING (
    app.is_active_member() AND (
      user_id = auth.uid() OR reviewer_id = auth.uid() OR
      app.has_any_role('super_admin', 'yayasan', 'pengurus') OR
      EXISTS (
        SELECT 1 FROM public.reviewer_assignments ra
        WHERE ra.reviewee_id = daily_reports.user_id
          AND ra.reviewer_id = auth.uid() AND ra.kind = 'report'
          AND ra.valid_from <= CURRENT_DATE AND (ra.valid_to IS NULL OR ra.valid_to >= CURRENT_DATE)
      )
    )
  );
DROP POLICY IF EXISTS "Users can manage items of own daily reports" ON public.report_items;
DROP POLICY IF EXISTS "Reviewers can view items of reviewed reports" ON public.report_items;
CREATE POLICY "Report owners can manage report items"
  ON public.report_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.daily_reports dr WHERE dr.id = report_id AND dr.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.daily_reports dr WHERE dr.id = report_id AND dr.user_id = auth.uid()));
CREATE POLICY "Authorized reviewers can view report items"
  ON public.report_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.daily_reports dr WHERE dr.id = report_id AND (dr.reviewer_id = auth.uid() OR app.has_any_role('super_admin', 'yayasan', 'pengurus'))));
DROP POLICY IF EXISTS "Reviewers can insert reviews" ON public.report_reviews;
CREATE POLICY "Assigned reviewers can insert reviews"
  ON public.report_reviews FOR INSERT TO authenticated
  WITH CHECK (
    app.is_active_member() AND reviewer_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.daily_reports dr WHERE dr.id = report_id AND dr.user_id = auth.uid())
    AND (
      app.has_any_role('super_admin', 'yayasan', 'pengurus') OR EXISTS (
        SELECT 1 FROM public.daily_reports dr
        JOIN public.reviewer_assignments ra ON ra.reviewee_id = dr.user_id AND ra.kind = 'report'
        WHERE dr.id = report_id AND ra.reviewer_id = auth.uid()
          AND ra.valid_from <= CURRENT_DATE AND (ra.valid_to IS NULL OR ra.valid_to >= CURRENT_DATE)
      )
    )
  );

-- Audience visibility is shared by page queries, RLS, and the calendar feed.
CREATE OR REPLACE FUNCTION app.can_view_audience(p_config jsonb, p_team_id text, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app, pg_temp
STABLE
AS $$
  SELECT app.is_active_member() AND (
    COALESCE(p_config->>'scope', 'all') = 'all'
    AND (p_team_id IS NULL OR p_team_id = (SELECT team_name FROM public.profiles WHERE id = p_user_id))
    OR COALESCE(p_config->>'scope', 'all') = 'users'
      AND (p_config->'userIds' ? p_user_id::text)
    OR COALESCE(p_config->>'scope', 'all') = 'member_type'
      AND (p_config->'memberTypes' ? (SELECT member_type FROM public.profiles WHERE id = p_user_id))
    OR COALESCE(p_config->>'scope', 'all') = 'team'
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.user_id = p_user_id AND tm.valid_to IS NULL
          AND p_config->'teamIds' ? tm.team_id::text
      )
  );
$$;

DROP POLICY IF EXISTS "Events are viewable by authenticated users" ON public.events;
DROP POLICY IF EXISTS "Announcements are viewable by authenticated users" ON public.announcements;
CREATE POLICY "Users can view published targeted events"
  ON public.events FOR SELECT TO authenticated
  USING (status <> 'cancelled' AND deleted_at IS NULL AND app.can_view_audience(audience_config, team_id));
CREATE POLICY "Users can view published unexpired targeted announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (status = 'published' AND (expires_at IS NULL OR expires_at > now()) AND app.can_view_audience(audience_config, team_id));

-- The server action is the only public-registration entry point; direct REST
-- inserts must not bypass its rate-limit and verification checks.
DROP POLICY IF EXISTS "Public can submit account requests" ON public.account_requests;
REVOKE INSERT, UPDATE, DELETE ON public.account_requests FROM anon, authenticated;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_buckets FROM anon, authenticated;

-- Attendance tables use canonical active-role checks instead of legacy
-- permission aliases that were not part of the original seed.
DROP POLICY IF EXISTS "Users can view own attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can insert own exceptions" ON public.attendance_exceptions;
DROP POLICY IF EXISTS "Users can view own exceptions" ON public.attendance_exceptions;
CREATE POLICY "Active users can view scoped attendance"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (app.is_active_member() AND (user_id = auth.uid() OR app.has_any_role('super_admin', 'yayasan', 'pengurus')));
CREATE POLICY "Active users can insert own exceptions"
  ON public.attendance_exceptions FOR INSERT TO authenticated
  WITH CHECK (app.is_active_member() AND user_id = auth.uid());
CREATE POLICY "Users and reviewers can view exceptions"
  ON public.attendance_exceptions FOR SELECT TO authenticated
  USING (app.is_active_member() AND (user_id = auth.uid() OR app.has_any_role('super_admin', 'yayasan', 'pengurus')));
CREATE POLICY "Active users can create correction requests"
  ON public.attendance_corrections FOR INSERT TO authenticated
  WITH CHECK (app.is_active_member() AND user_id = auth.uid());
CREATE POLICY "Users and reviewers can view corrections"
  ON public.attendance_corrections FOR SELECT TO authenticated
  USING (app.is_active_member() AND (user_id = auth.uid() OR reviewer_id = auth.uid() OR app.has_any_role('super_admin', 'yayasan', 'pengurus')));

-- Calendar bearer tokens are immutable; only a server-side revoke operation may
-- change their lifecycle.
DROP POLICY IF EXISTS "Users can revoke own calendar subscriptions" ON public.calendar_subscriptions;
CREATE OR REPLACE FUNCTION app.revoke_calendar_subscription(p_subscription_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
  UPDATE public.calendar_subscriptions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE id = p_subscription_id AND user_id = auth.uid()
  RETURNING true;
$$;
REVOKE ALL ON FUNCTION app.revoke_calendar_subscription(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.revoke_calendar_subscription(uuid) TO authenticated;

-- Coordinator assignment must not reopen historical membership rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_coordinator_per_team
  ON public.team_members(team_id) WHERE team_role = 'coordinator' AND valid_to IS NULL;
CREATE OR REPLACE FUNCTION app.team_set_coordinator(p_team_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_now date := CURRENT_DATE;
  v_active_member public.team_members%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT app.has_any_role('super_admin', 'pengurus') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki akses mengatur koordinator.');
  END IF;
  UPDATE public.team_members
  SET valid_to = v_now, team_role = 'member'
  WHERE team_id = p_team_id AND team_role = 'coordinator' AND valid_to IS NULL;
  SELECT * INTO v_active_member
  FROM public.team_members
  WHERE team_id = p_team_id AND user_id = p_user_id AND valid_to IS NULL
  ORDER BY valid_from DESC, created_at DESC
  LIMIT 1;
  IF v_active_member.id IS NULL THEN
    INSERT INTO public.team_members (team_id, user_id, team_role, valid_from)
    VALUES (p_team_id, p_user_id, 'coordinator', v_now);
  ELSE
    UPDATE public.team_members SET team_role = 'coordinator' WHERE id = v_active_member.id;
  END IF;
  RETURN jsonb_build_object('success', true, 'message', 'Koordinator tim berhasil diperbarui secara atomik.');
END;
$$;

-- The final state-machine guard for review-required tasks.
CREATE OR REPLACE FUNCTION app.task_transition(p_task_id uuid, p_new_status text, p_user_id uuid, p_note text DEFAULT NULL)
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
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id OR NOT app.is_active_member() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sesi tidak valid atau akun tidak aktif.');
  END IF;
  IF p_new_status NOT IN ('todo', 'in_progress', 'in_review', 'done', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Status tugas tidak valid.');
  END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT app.can_access_task(p_task_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tugas tidak ditemukan atau tidak dapat diakses.');
  END IF;
  v_allowed := v_task.created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = p_task_id AND ta.user_id = auth.uid() AND ta.unassigned_at IS NULL)
    OR app.has_any_role('super_admin', 'yayasan', 'pengurus');
  IF NOT v_allowed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki akses untuk mengubah tugas ini.');
  END IF;
  IF v_task.requires_review AND v_task.status = 'in_review' AND p_new_status = 'done'
     AND NOT (v_task.reviewer_id = auth.uid() OR app.has_any_role('super_admin', 'yayasan', 'pengurus')) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hanya reviewer yang dapat menyetujui tugas ini.');
  END IF;
  IF p_new_status = 'done' AND v_task.requires_review AND v_task.status <> 'in_review' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tugas ini memerlukan review sebelum selesai.');
  END IF;
  IF v_task.status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'new_status', p_new_status, 'message', 'Status tugas sudah sesuai.');
  END IF;
  UPDATE public.tasks SET status = p_new_status, completed_at = CASE WHEN p_new_status = 'done' THEN v_now ELSE NULL END, updated_at = v_now WHERE id = p_task_id;
  INSERT INTO public.task_status_history (task_id, from_status, to_status, changed_by, changed_at, note)
  VALUES (p_task_id, v_task.status, p_new_status, auth.uid(), v_now, p_note);
  RETURN jsonb_build_object('success', true, 'new_status', p_new_status, 'message', 'Status tugas berhasil diperbarui.');
END;
$$;

REVOKE ALL ON FUNCTION app.task_transition(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.task_transition(uuid, text, uuid, text) TO authenticated;

-- Policy activation is a single database transaction so an active policy can
-- never disappear between archiving the old version and activating the new one.
CREATE OR REPLACE FUNCTION app.activate_policy(p_policy_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_policy public.policy_settings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT app.has_role('super_admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hanya Super Admin yang dapat mengaktifkan kebijakan.');
  END IF;
  SELECT * INTO v_policy FROM public.policy_settings WHERE id = p_policy_id FOR UPDATE;
  IF NOT FOUND OR v_policy.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kebijakan harus berstatus approved.');
  END IF;
  IF v_policy.effective_from > (now() AT TIME ZONE 'Asia/Jakarta')::date THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kebijakan belum memasuki tanggal berlaku.');
  END IF;
  UPDATE public.policy_settings SET status = 'archived' WHERE status = 'active';
  UPDATE public.policy_settings SET status = 'active' WHERE id = p_policy_id AND status = 'approved';
  INSERT INTO public.policy_approval_events(policy_id, actor_id, from_status, to_status)
  VALUES (p_policy_id, auth.uid(), 'approved', 'active');
  RETURN jsonb_build_object('success', true, 'message', 'Kebijakan berhasil diaktifkan.');
END;
$$;
REVOKE ALL ON FUNCTION app.activate_policy(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.activate_policy(text) TO authenticated;

-- A fresh deployment has a safe baseline policy instead of an unusable empty
-- policy table. It remains active until a two-stage replacement is approved.
INSERT INTO public.policy_settings (
  id, code, name, attendance_cutoff_time, attendance_grace_cutoff_time,
  report_deadline_time, status, effective_from, change_reason
)
SELECT
  'pol-baseline-2026', 'POL-BASELINE-2026', 'Kebijakan Operasional Baseline',
  '08:00', '08:15', '21:00', 'active', (now() AT TIME ZONE 'Asia/Jakarta')::date,
  'Baseline awal sistem; perubahan berikutnya wajib melalui approval dua tahap.'
WHERE NOT EXISTS (SELECT 1 FROM public.policy_settings WHERE status = 'active');

-- Attendance correction and exception decisions are transactional and cannot
-- be forged by writing directly to the source tables.
CREATE OR REPLACE FUNCTION app.review_attendance_correction(p_correction_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_correction public.attendance_corrections%ROWTYPE;
  v_record public.attendance_records%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT app.has_any_role('super_admin', 'yayasan', 'pengurus') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki akses memproses koreksi.');
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Keputusan koreksi tidak valid.');
  END IF;
  SELECT * INTO v_correction FROM public.attendance_corrections WHERE id = p_correction_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Koreksi tidak ditemukan atau sudah diproses.'); END IF;
  IF p_decision = 'approved' THEN
    SELECT * INTO v_record FROM public.attendance_records WHERE user_id = v_correction.user_id AND attendance_date = v_correction.attendance_date FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Record presensi asal tidak ditemukan.'); END IF;
    UPDATE public.attendance_records SET classification = v_correction.requested_classification, client_meta = COALESCE(client_meta, '{}'::jsonb) || jsonb_build_object('correction_id', p_correction_id), updated_at = now() WHERE id = v_record.id;
  END IF;
  UPDATE public.attendance_corrections SET status = p_decision::public.correction_status_type, reviewer_id = auth.uid(), review_note = p_note, decided_at = now() WHERE id = p_correction_id;
  RETURN jsonb_build_object('success', true, 'message', 'Koreksi presensi berhasil diproses.');
END;
$$;
REVOKE ALL ON FUNCTION app.review_attendance_correction(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.review_attendance_correction(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION app.review_attendance_exception(p_exception_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT app.has_any_role('super_admin', 'yayasan', 'pengurus') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki akses memproses izin.');
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN RETURN jsonb_build_object('success', false, 'message', 'Keputusan izin tidak valid.'); END IF;
  UPDATE public.attendance_exceptions
  SET status = p_decision::public.correction_status_type, decided_by = auth.uid(), decided_at = now(), reason = reason || CASE WHEN p_note IS NULL OR p_note = '' THEN '' ELSE E'\nCatatan reviewer: ' || p_note END
  WHERE id = p_exception_id AND status = 'pending';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Pengajuan izin tidak ditemukan atau sudah diproses.'); END IF;
  RETURN jsonb_build_object('success', true, 'message', 'Pengajuan izin berhasil diproses.');
END;
$$;
REVOKE ALL ON FUNCTION app.review_attendance_exception(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.review_attendance_exception(uuid, text, text) TO authenticated;
