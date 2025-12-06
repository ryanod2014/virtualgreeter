-- ============================================================================
-- ADD EMAIL STATUS TO INVITES
-- ============================================================================
-- Track email delivery status for invite retry mechanism
-- ============================================================================

-- Add email_status column
ALTER TABLE public.invites
ADD COLUMN email_status TEXT NOT NULL DEFAULT 'pending'
CHECK (email_status IN ('sent', 'pending', 'failed'));

-- Add index for querying failed invites
CREATE INDEX idx_invites_email_status ON public.invites(email_status);

-- Add comment explaining the field
COMMENT ON COLUMN public.invites.email_status IS
'Email delivery status: sent (successful), pending (in progress), failed (all retries exhausted)';
