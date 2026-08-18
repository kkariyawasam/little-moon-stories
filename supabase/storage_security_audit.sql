-- Cozy Kid Tales: enforce and verify private customer audio storage.
-- Safe to run repeatedly in the Supabase SQL Editor.

-- Customer and admin story audio must never be public buckets.
UPDATE storage.buckets
SET public = false
WHERE id IN ('story-audio', 'admin-story-audio');

-- This restrictive policy overrides any broader permissive browser policy for
-- private audio. service_role operations and signed URLs continue to work.
DROP POLICY IF EXISTS "Block browser access to private story audio" ON storage.objects;
CREATE POLICY "Block browser access to private story audio"
ON storage.objects
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (bucket_id NOT IN ('story-audio', 'admin-story-audio'))
WITH CHECK (bucket_id NOT IN ('story-audio', 'admin-story-audio'));

-- Result 1: both private buckets must show public = false.
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('story-audio', 'admin-story-audio')
ORDER BY id;

-- Result 2: inspect every Storage policy. No permissive anon/authenticated
-- policy should grant access to story-audio or admin-story-audio.
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- Result 3: storage.objects must have RLS enabled.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage'
  AND c.relname = 'objects';
