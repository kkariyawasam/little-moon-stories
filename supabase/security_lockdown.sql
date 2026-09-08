-- Cozy Kid Tales: production database lockdown.
-- Run once in the Supabase SQL Editor after the main schema migrations.
--
-- The current application does not use Supabase Auth for parent accounts.
-- All customer access goes through the Vercel API or trusted Edge Functions,
-- so browser roles must have no direct table access.

DO $$
DECLARE
  table_name TEXT;
  protected_tables TEXT[] := ARRAY[
    'subscribers',
    'children',
    'story_jobs',
    'story_audio',
    'delivery_attempts',
    'stories',
    'payments',
    'api_rate_limits',
    'admin_scheduled_story_emails',
    'admin_story_email_events'
  ];
BEGIN
  FOREACH table_name IN ARRAY protected_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated',
        table_name
      );
    END IF;
  END LOOP;
END;
$$;

-- Explicitly protect payment-controlled subscriber fields. This is defense in
-- depth; the table-level revoke above already prevents browser updates.
REVOKE UPDATE (
  payment_status,
  package_end_date,
  payment_provider_order_id
) ON public.subscribers FROM PUBLIC, anon, authenticated;

-- Protect trial_status too if it is introduced by a later migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscribers'
      AND column_name = 'trial_status'
  ) THEN
    EXECUTE 'REVOKE UPDATE (trial_status) ON public.subscribers FROM PUBLIC, anon, authenticated';
  END IF;
END;
$$;

-- Identity/serial sequences must not be callable directly from browser roles.
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Keep future public-schema objects private by default. Explicitly grant only
-- the minimum required permission in a later migration when adding a feature.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Audio buckets contain private child content and must never be public.
UPDATE storage.buckets
SET public = false
WHERE id IN ('story-audio', 'admin-story-audio');

-- Restrictive policies block direct browser access to these two buckets even
-- if a broader permissive Storage policy is accidentally added elsewhere.
DROP POLICY IF EXISTS "Block browser access to private story audio" ON storage.objects;
CREATE POLICY "Block browser access to private story audio"
ON storage.objects
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (bucket_id NOT IN ('story-audio', 'admin-story-audio'))
WITH CHECK (bucket_id NOT IN ('story-audio', 'admin-story-audio'));

-- Verification report: every listed public table should show rls_enabled=true.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'SELECT') AS anon_can_select,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'UPDATE') AS anon_can_update,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'SELECT') AS authenticated_can_select,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'UPDATE') AS authenticated_can_update
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relname = ANY (ARRAY[
    'subscribers',
    'children',
    'story_jobs',
    'story_audio',
    'delivery_attempts',
    'stories',
    'payments',
    'api_rate_limits',
    'admin_scheduled_story_emails',
    'admin_story_email_events'
  ])
ORDER BY c.relname;

SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage'
  AND c.relname = 'objects';

-- Verification report: only the restrictive private-audio policy should be
-- needed for these buckets; service_role bypasses RLS for trusted operations.
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
