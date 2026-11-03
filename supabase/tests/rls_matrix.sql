BEGIN;

SELECT plan(8);

-- These fixed identities are disposable test fixtures. They never leave the
-- local database because the test transaction is rolled back at the end.
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-active@example.test', 'not-a-password', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-suspended@example.test', 'not-a-password', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-outsider@example.test', 'not-a-password', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

INSERT INTO public.profiles (id, email, full_name, status, member_type)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'rls-active@example.test', 'RLS Active', 'active', 'santri'),
  ('00000000-0000-0000-0000-000000000102', 'rls-suspended@example.test', 'RLS Suspended', 'suspended', 'santri'),
  ('00000000-0000-0000-0000-000000000103', 'rls-outsider@example.test', 'RLS Outsider', 'active', 'santri');

INSERT INTO public.user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000101', id FROM public.roles WHERE key = 'santri';
INSERT INTO public.user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000103', id FROM public.roles WHERE key = 'santri';

INSERT INTO public.tasks (id, title, description, created_by, status)
VALUES ('00000000-0000-0000-0000-000000000201', 'RLS fixture task', 'Disposable RLS fixture', '00000000-0000-0000-0000-000000000101', 'todo');

INSERT INTO public.daily_reports (id, user_id, report_date, submission_status, review_status)
VALUES ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', DATE '2026-11-03', 'submitted', 'not_reviewed');

SELECT set_config('app.rls_test.active_user', '00000000-0000-0000-0000-000000000101', true);
SELECT set_config('app.rls_test.suspended_user', '00000000-0000-0000-0000-000000000102', true);
SELECT set_config('app.rls_test.outsider_user', '00000000-0000-0000-0000-000000000103', true);
SELECT set_config('app.rls_test.task_id', '00000000-0000-0000-0000-000000000201', true);
SELECT set_config('app.rls_test.report_id', '00000000-0000-0000-0000-000000000301', true);

-- Run the reads as the same database role used by PostgREST for user calls.
SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claim.sub', current_setting('app.rls_test.active_user'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('app.rls_test.active_user'), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.tasks WHERE id = current_setting('app.rls_test.task_id')::uuid),
  1,
  'active owner can read own task'
);
SELECT is(
  (SELECT count(*)::int FROM public.daily_reports WHERE id = current_setting('app.rls_test.report_id')::uuid),
  1,
  'active owner can read own report'
);

SELECT set_config('request.jwt.claim.sub', current_setting('app.rls_test.outsider_user'), true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('app.rls_test.outsider_user'), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.tasks WHERE id = current_setting('app.rls_test.task_id')::uuid),
  0,
  'unrelated active user cannot read another user task'
);
SELECT is(
  (SELECT count(*)::int FROM public.daily_reports WHERE id = current_setting('app.rls_test.report_id')::uuid),
  0,
  'unrelated active user cannot read another user report'
);

SELECT set_config('request.jwt.claim.sub', current_setting('app.rls_test.suspended_user'), true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('app.rls_test.suspended_user'), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.tasks WHERE id = current_setting('app.rls_test.task_id')::uuid),
  0,
  'suspended user cannot read task data'
);
SELECT is(
  (SELECT count(*)::int FROM public.daily_reports WHERE id = current_setting('app.rls_test.report_id')::uuid),
  0,
  'suspended user cannot read report data'
);
SELECT is(
  (app.task_transition(
    current_setting('app.rls_test.task_id')::uuid,
    'in_progress',
    current_setting('app.rls_test.suspended_user')::uuid
  )->>'success'),
  'false',
  'suspended user cannot transition a task through the RPC'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
