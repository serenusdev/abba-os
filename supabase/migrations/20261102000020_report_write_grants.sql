-- Report lifecycle is server-mediated through app.save_report and
-- app.review_report. Do not expose direct authenticated writes that could
-- mutate review metadata or bypass the report state machine.
REVOKE INSERT, UPDATE, DELETE ON public.daily_reports FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.report_items FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.report_reviews FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.report_revisions FROM anon, authenticated;

GRANT SELECT ON public.daily_reports, public.report_items, public.report_reviews TO authenticated;
