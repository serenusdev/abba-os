-- IAM follow-up: make account approval atomic and make device revocation explicit.

CREATE OR REPLACE FUNCTION app.approve_account_application(
  p_request_id uuid,
  p_auth_user_id uuid,
  p_role_key text,
  p_approver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_request public.account_requests%ROWTYPE;
  v_role public.roles%ROWTYPE;
  v_approver_role text;
  v_approver_priority integer;
  v_target_priority integer;
  v_existing_role uuid;
BEGIN
  -- This function is called by the server-side admin client after the request
  -- and email-confirmation checks. Keep the guard here so the transaction
  -- cannot be invoked by an anonymous or ordinary client.
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     AND auth.uid() IS DISTINCT FROM p_approver_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pemanggil tidak memiliki kewenangan menyetujui akun.');
  END IF;

  SELECT * INTO v_request
  FROM public.account_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pengajuan akun tidak ditemukan.');
  END IF;
  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', format('Pengajuan ini sudah berstatus "%s".', v_request.status));
  END IF;
  IF v_request.auth_user_id IS DISTINCT FROM p_auth_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Akun Auth pengajuan tidak cocok.');
  END IF;

  SELECT * INTO v_role FROM public.roles WHERE key = lower(trim(p_role_key));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Role tujuan tidak ditemukan.');
  END IF;

  SELECT r.key INTO v_approver_role
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  JOIN public.profiles p ON p.id = ur.user_id AND p.status = 'active'
  WHERE ur.user_id = p_approver_id
    AND ur.revoked_at IS NULL
    AND r.key IN ('super_admin', 'yayasan', 'pengurus')
  ORDER BY CASE r.key WHEN 'super_admin' THEN 1 WHEN 'yayasan' THEN 2 ELSE 3 END
  LIMIT 1;

  IF v_approver_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Approver bukan anggota aktif dengan kewenangan IAM.');
  END IF;

  v_approver_priority := CASE v_approver_role
    WHEN 'super_admin' THEN 5
    WHEN 'yayasan' THEN 4
    WHEN 'pengurus' THEN 3
    ELSE 0
  END;
  v_target_priority := CASE v_role.key
    WHEN 'super_admin' THEN 5
    WHEN 'yayasan' THEN 4
    WHEN 'pengurus' THEN 3
    WHEN 'koordinator' THEN 2
    ELSE 1
  END;
  IF v_target_priority >= v_approver_priority THEN
    RETURN jsonb_build_object('success', false, 'message', 'Role tujuan setara atau lebih tinggi dari approver.');
  END IF;

  -- All writes below are in the same transaction as the request transition.
  INSERT INTO public.profiles (
    id, email, full_name, phone_number, status, member_type, team_name, updated_at
  ) VALUES (
    p_auth_user_id, v_request.email, v_request.full_name, v_request.phone_number,
    'active', v_role.key, COALESCE(v_request.team_requested, 'Sentra Santri'), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    status = 'active',
    member_type = EXCLUDED.member_type,
    team_name = EXCLUDED.team_name,
    updated_at = now();

  SELECT ur.id INTO v_existing_role
  FROM public.user_roles ur
  WHERE ur.user_id = p_auth_user_id
    AND ur.role_id = v_role.id
    AND ur.revoked_at IS NULL
  FOR UPDATE;

  IF v_existing_role IS NULL THEN
    INSERT INTO public.user_roles (user_id, role_id, granted_by)
    VALUES (p_auth_user_id, v_role.id, p_approver_id);
  END IF;

  UPDATE public.account_requests
  SET status = 'approved',
      approved_at = now(),
      approved_by = p_approver_id,
      reviewed_at = now(),
      reviewed_by = p_approver_id,
      updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.audit_logs (
    event_name, actor_id, actor_name, target_id, target_label, action_detail
  )
  SELECT
    'iam.account_approved', p_approver_id, p.full_name, p_request_id::text,
    format('Permohonan %s', p_request_id),
    format('Persetujuan akun dengan peran %s.', v_role.key)
  FROM public.profiles p
  WHERE p.id = p_approver_id;

  RETURN jsonb_build_object('success', true, 'message', 'Akun berhasil diprovisikan secara atomik.');
END;
$$;

REVOKE ALL ON FUNCTION app.approve_account_application(uuid, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.approve_account_application(uuid, uuid, text, uuid) TO service_role;

COMMENT ON FUNCTION app.approve_account_application(uuid, uuid, text, uuid)
  IS 'Atomically provisions profile, role, approval state, and audit record for a confirmed account.';
