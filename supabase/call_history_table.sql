-- Call History table for Admin Home
CREATE TABLE IF NOT EXISTS public.call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for faster phone number lookups
CREATE INDEX IF NOT EXISTS idx_call_history_phone ON public.call_history (phone_number);

-- Index for date-based sorting
CREATE INDEX IF NOT EXISTS idx_call_history_created_at ON public.call_history (created_at DESC);

-- Optional: Add a comment
COMMENT ON TABLE public.call_history IS 'Stores phone numbers submitted by admin for quick access and call history tracking';
