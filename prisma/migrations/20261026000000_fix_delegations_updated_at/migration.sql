ALTER TABLE public.delegations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();
