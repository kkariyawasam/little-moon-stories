-- Run this migration in the Supabase SQL Editor before deploying the matching API.

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  rate_key TEXT PRIMARY KEY,
  bucket_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0)
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_rate_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF p_rate_key IS NULL OR length(p_rate_key) <> 64
     OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate-limit parameters';
  END IF;

  INSERT INTO public.api_rate_limits (rate_key, bucket_start, attempt_count)
  VALUES (p_rate_key, now(), 1)
  ON CONFLICT (rate_key) DO UPDATE
  SET attempt_count = CASE
        WHEN api_rate_limits.bucket_start <= now() - make_interval(secs => p_window_seconds)
          THEN 1
        ELSE api_rate_limits.attempt_count + 1
      END,
      bucket_start = CASE
        WHEN api_rate_limits.bucket_start <= now() - make_interval(secs => p_window_seconds)
          THEN now()
        ELSE api_rate_limits.bucket_start
      END
  RETURNING attempt_count INTO current_count;

  RETURN current_count > p_limit;
END;
$$;

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

SELECT
  c.relrowsecurity AS rls_enabled,
  has_table_privilege('anon', 'public.api_rate_limits', 'SELECT') AS anon_can_select,
  has_table_privilege('authenticated', 'public.api_rate_limits', 'SELECT') AS authenticated_can_select
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'api_rate_limits';
