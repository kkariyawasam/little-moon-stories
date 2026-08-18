-- Cozy Kid Tales: minimize child data in an existing database.
-- Run after deploying the matching API and Edge Function changes.

-- Gender is no longer collected. Keep the existing column temporarily for
-- compatibility, but erase historical values and use a neutral placeholder.
ALTER TABLE public.children
  ALTER COLUMN gender SET DEFAULT 'not_provided';

UPDATE public.children
SET gender = 'not_provided'
WHERE gender IS DISTINCT FROM 'not_provided';

-- Existing story jobs may contain duplicated email, timezone, delivery time,
-- gender, and birth-year data. Keep only generation inputs that are necessary.
UPDATE public.story_jobs AS job
SET prompt_payload = jsonb_build_object(
  'age_range', job.prompt_payload -> 'age_range',
  'preferred_theme', job.prompt_payload -> 'preferred_theme',
  'favorite_hobby', job.prompt_payload -> 'favorite_hobby',
  'favorite_animal', job.prompt_payload -> 'favorite_animal',
  'children', COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('nickname', child -> 'nickname')
      )
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(job.prompt_payload -> 'children') = 'array'
            THEN job.prompt_payload -> 'children'
          ELSE '[]'::jsonb
        END
      ) AS child
    ),
    '[]'::jsonb
  )
)
WHERE job.prompt_payload IS NOT NULL;

-- Verification: these counts should all be zero.
SELECT
  count(*) FILTER (WHERE prompt_payload ? 'parent_email') AS jobs_with_parent_email,
  count(*) FILTER (WHERE prompt_payload ? 'timezone') AS jobs_with_timezone,
  count(*) FILTER (WHERE prompt_payload ? 'delivery_time') AS jobs_with_delivery_time,
  count(*) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(prompt_payload -> 'children') = 'array'
            THEN prompt_payload -> 'children'
          ELSE '[]'::jsonb
        END
      ) AS child
      WHERE child ? 'gender' OR child ? 'birthday'
    )
  ) AS jobs_with_extra_child_fields
FROM public.story_jobs;
