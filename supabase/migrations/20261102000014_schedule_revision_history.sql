-- Schedule lifecycle audit follow-up: preserve immutable revisions for agenda
-- and announcements while keeping published rows soft-cancellable/archivable.

CREATE TABLE IF NOT EXISTS public.event_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, revision_no)
);

CREATE TABLE IF NOT EXISTS public.announcement_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, revision_no)
);

ALTER TABLE public.event_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Administrators can view event revisions"
  ON public.event_revisions FOR SELECT TO authenticated
  USING (app.has_any_role('super_admin', 'yayasan', 'pengurus'));
CREATE POLICY "Administrators can view announcement revisions"
  ON public.announcement_revisions FOR SELECT TO authenticated
  USING (app.has_any_role('super_admin', 'yayasan', 'pengurus'));

REVOKE INSERT, UPDATE, DELETE ON public.event_revisions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.announcement_revisions FROM anon, authenticated;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS recurrence_until timestamptz;
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_event_revisions_event_created
  ON public.event_revisions(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_revisions_announcement_created
  ON public.announcement_revisions(announcement_id, created_at DESC);
