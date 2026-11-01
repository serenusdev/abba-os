-- =============================================================================
-- Migration: 20261101000009_bug_fix_missing_columns.sql
-- Purpose: Add columns that were referenced in application code but missing
--          from the original schema definitions. Fixes three review blockers:
--
--   F1 — daily_reports.reviewed_at (TIMESTAMPTZ)
--         Required by reviewReportAction so the review update is not rejected
--         by Postgres with "column does not exist" (42703).
--
--   F2 — account_requests.auth_user_id (UUID → auth.users)
--         Required by submitAccountApplicationAction to store the Auth user ID
--         created at registration time, and by approveAccountApplicationAction
--         to activate the Auth user on approval.
--
--   F3 — account_requests.approved_at (TIMESTAMPTZ)
--         account_requests.approved_by (UUID → profiles)
--         Required by approveAccountApplicationAction to record who approved
--         and when. The table already has reviewed_at/reviewed_by for revision
--         workflow; these new columns track the final approval separately.
-- =============================================================================

-- F1: Add reviewed_at to daily_reports
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- F2: Add auth_user_id to account_requests
ALTER TABLE public.account_requests
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- F3: Add approved_at and approved_by to account_requests
ALTER TABLE public.account_requests
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.account_requests
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
