-- Cozy Kid Tales: payment idempotency for an existing database.
-- Run once in the Supabase SQL Editor.

-- Review duplicates before creating the unique index. This block fails closed
-- rather than silently changing payment records.
DO $$
BEGIN
  IF EXISTS (
    SELECT payment_provider_order_id
    FROM public.subscribers
    WHERE payment_provider_order_id IS NOT NULL
    GROUP BY payment_provider_order_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate payment_provider_order_id values exist. Resolve them before applying payment security.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_unique_payment_order
  ON public.subscribers(payment_provider_order_id)
  WHERE payment_provider_order_id IS NOT NULL;

-- Browser roles must never activate plans or alter payment-controlled dates.
REVOKE UPDATE (
  payment_status,
  package_end_date,
  payment_provider_order_id
) ON public.subscribers FROM PUBLIC, anon, authenticated;

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'idx_subscribers_unique_payment_order';
