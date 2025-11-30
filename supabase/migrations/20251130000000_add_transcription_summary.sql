-- ============================================================================
-- ADD TRANSCRIPTION AND AI SUMMARY COLUMNS TO CALL_LOGS
-- ============================================================================
-- Migration: Add support for call transcription and AI summaries
-- Date: 2024-11-30
-- ============================================================================

-- Add transcription column (stores the full transcription text)
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS transcription TEXT;

-- Add transcription metadata
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS transcription_status TEXT CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS transcription_error TEXT,
ADD COLUMN IF NOT EXISTS transcription_duration_seconds NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS transcription_cost NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS transcribed_at TIMESTAMPTZ;

-- Add AI summary column
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Add AI summary metadata
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS ai_summary_status TEXT CHECK (ai_summary_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS ai_summary_error TEXT,
ADD COLUMN IF NOT EXISTS ai_summary_cost NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS summarized_at TIMESTAMPTZ;

-- Index for finding calls needing processing
CREATE INDEX IF NOT EXISTS idx_call_logs_transcription_status 
ON public.call_logs(transcription_status) 
WHERE transcription_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_logs_ai_summary_status 
ON public.call_logs(ai_summary_status) 
WHERE ai_summary_status IS NOT NULL;

-- Index for searching transcriptions (full text search)
CREATE INDEX IF NOT EXISTS idx_call_logs_transcription_search 
ON public.call_logs USING gin(to_tsvector('english', COALESCE(transcription, '')))
WHERE transcription IS NOT NULL;

-- ============================================================================
-- USAGE TRACKING TABLE (for billing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    call_log_id UUID REFERENCES public.call_logs(id) ON DELETE SET NULL,
    usage_type TEXT NOT NULL CHECK (usage_type IN ('transcription', 'ai_summary')),
    duration_seconds NUMERIC(10,2) NOT NULL,
    cost NUMERIC(10,4) NOT NULL,
    billed BOOLEAN DEFAULT FALSE,
    billed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for billing queries
CREATE INDEX IF NOT EXISTS idx_usage_records_org_unbilled 
ON public.usage_records(organization_id, created_at) 
WHERE billed = FALSE;

CREATE INDEX IF NOT EXISTS idx_usage_records_org_type 
ON public.usage_records(organization_id, usage_type, created_at DESC);

-- RLS policies for usage_records
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- Admins can view their org's usage
CREATE POLICY "Admins can view org usage"
ON public.usage_records FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================================================
-- COMMENT DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.call_logs.transcription IS 'Full text transcription of the call audio';
COMMENT ON COLUMN public.call_logs.transcription_status IS 'Status of transcription: pending, processing, completed, failed';
COMMENT ON COLUMN public.call_logs.ai_summary IS 'AI-generated summary of the call based on transcription';
COMMENT ON COLUMN public.call_logs.ai_summary_status IS 'Status of AI summary: pending, processing, completed, failed';
COMMENT ON TABLE public.usage_records IS 'Tracks billable usage for transcription and AI summary features';

