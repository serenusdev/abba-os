CREATE TABLE IF NOT EXISTS public.resource_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  rejected_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'validated' CHECK (status IN ('validated', 'completed', 'completed_with_errors', 'failed')),
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Resource admins can view import batches" ON public.resource_import_batches;
CREATE POLICY "Resource admins can view import batches"
  ON public.resource_import_batches FOR SELECT TO authenticated
  USING (app.has_any_role('super_admin', 'yayasan', 'pengurus'));
REVOKE INSERT, UPDATE, DELETE ON public.resource_import_batches FROM anon, authenticated;
