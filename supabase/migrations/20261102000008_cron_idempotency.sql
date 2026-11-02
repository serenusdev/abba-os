-- Prevent duplicate notification sends when the scheduler retries within the
-- same operational window.
CREATE TABLE IF NOT EXISTS public.cron_job_runs (
  job_key text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
  error_message text
);

ALTER TABLE public.cron_job_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cron_job_runs FROM anon, authenticated;
