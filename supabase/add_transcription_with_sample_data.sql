-- ============================================================================
-- TRANSCRIPTION & AI SUMMARY MIGRATION
-- Run this on both PRODUCTION and STAGING databases
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD COLUMNS TO CALL_LOGS
-- ============================================================================

-- Add transcription columns
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS transcription TEXT;

ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS transcription_status TEXT CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS transcription_error TEXT;

ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS transcription_duration_seconds NUMERIC(10,2);

ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS transcription_cost NUMERIC(10,4);

ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS transcribed_at TIMESTAMPTZ;

-- Add AI summary columns
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS ai_summary_status TEXT CHECK (ai_summary_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS ai_summary_error TEXT;

ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS ai_summary_cost NUMERIC(10,4);

ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS summarized_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: CREATE USAGE RECORDS TABLE
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_transcription_status 
ON public.call_logs(transcription_status) 
WHERE transcription_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_logs_ai_summary_status 
ON public.call_logs(ai_summary_status) 
WHERE ai_summary_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usage_records_org_unbilled 
ON public.usage_records(organization_id, created_at) 
WHERE billed = FALSE;

-- RLS for usage_records
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view org usage" ON public.usage_records;
CREATE POLICY "Admins can view org usage"
ON public.usage_records FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================================================
-- STEP 3: ADD SAMPLE DATA TO RECENT CALL LOGS
-- This updates the 3 most recent COMPLETED calls per organization
-- ============================================================================

-- Sample 1: Completed transcription + AI summary (most recent call)
WITH recent_calls AS (
    SELECT id, organization_id, duration_seconds,
           ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at DESC) as rn
    FROM public.call_logs
    WHERE status = 'completed' 
      AND duration_seconds > 30
      AND transcription_status IS NULL
)
UPDATE public.call_logs cl
SET 
    transcription_status = 'completed',
    transcription = 'Agent: Hi there! Thanks for visiting our website today. How can I help you?

Visitor: Hey, yeah I was looking at your pricing page and had some questions about the enterprise plan.

Agent: Of course! I''d be happy to help with that. What specifically would you like to know about the enterprise plan?

Visitor: Well, mainly I''m wondering about the volume discounts. We have about 50 sales reps who would be using this.

Agent: That''s great! For a team of 50, you would definitely qualify for our volume pricing. We typically offer around 20% off for teams of that size. Let me pull up the exact numbers for you.

Visitor: That sounds good. Also, is there a setup fee or anything like that?

Agent: No setup fees at all. We include onboarding and training as part of the enterprise package. You''d also get a dedicated customer success manager.

Visitor: Perfect. And what about integrations? We use Salesforce and HubSpot.

Agent: Both are fully supported. We have native integrations with Salesforce and HubSpot that sync in real-time. Most customers get that set up within a day.

Visitor: Alright, this is sounding good. Can you send me a proposal?

Agent: Absolutely! I''ll put together a custom proposal based on 50 seats with the volume discount and send it over today. What''s the best email to reach you?

Visitor: Use john@acmecorp.com

Agent: Got it. You''ll have that within the hour. Is there anything else I can help with today?

Visitor: No, that covers it. Thanks for your help!

Agent: My pleasure! Talk to you soon.',
    transcription_duration_seconds = COALESCE(rc.duration_seconds, 180),
    transcription_cost = ROUND(COALESCE(rc.duration_seconds, 180) / 60.0 * 0.01, 4),
    transcribed_at = NOW() - INTERVAL '5 minutes',
    ai_summary_status = 'completed',
    ai_summary = '## Summary
A sales inquiry call where the visitor asked about enterprise pricing for a team of 50 sales reps. The agent explained volume discounts (~20% off), included onboarding, and confirmed Salesforce/HubSpot integrations.

## Customer Interest
- **Product/Service:** Enterprise plan for sales team
- **Problem to solve:** Need video chat solution for 50 sales reps
- **Budget/Timeline:** Ready to move forward, requested proposal

## Key Discussion Points
1. Volume pricing and discounts for 50-seat team
2. No setup fees, includes onboarding and dedicated CSM
3. Native integrations with Salesforce and HubSpot

## Objections & Concerns
- None raised - visitor was satisfied with all answers

## Action Items
- [x] Send custom proposal to john@acmecorp.com
- [ ] Follow up if no response within 48 hours

## Call Outcome
**Qualified Lead** - High intent, requested proposal

## Notes
Decision maker, ready to buy. Hot lead - prioritize follow-up.',
    ai_summary_cost = ROUND(COALESCE(rc.duration_seconds, 180) / 60.0 * 0.02, 4),
    summarized_at = NOW() - INTERVAL '4 minutes'
FROM recent_calls rc
WHERE cl.id = rc.id AND rc.rn = 1;

-- Sample 2: Completed transcription, AI summary processing (2nd most recent)
WITH recent_calls AS (
    SELECT id, organization_id, duration_seconds,
           ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at DESC) as rn
    FROM public.call_logs
    WHERE status = 'completed' 
      AND duration_seconds > 30
      AND transcription_status IS NULL
)
UPDATE public.call_logs cl
SET 
    transcription_status = 'completed',
    transcription = 'Agent: Good afternoon! Welcome to our site. What brings you here today?

Visitor: Hi, I''m just browsing really. Saw an ad on LinkedIn.

Agent: Nice! What caught your attention about the ad?

Visitor: The video chat thing looked interesting. We''re a small agency and sometimes clients want to see us face to face but we''re remote.

Agent: That makes total sense. A lot of agencies use us for exactly that - being able to have that personal connection with clients even when remote.

Visitor: How does it work exactly?

Agent: Basically, you put our widget on your website. When a visitor lands on your site and one of your team members is available, they see a video of your team member waving at them. If they click, it starts a live video call.

Visitor: Oh that''s cool. So it''s like proactive outreach?

Agent: Exactly. Instead of waiting for them to fill out a form, you''re engaging them right when they''re interested.

Visitor: Interesting. Let me think about it and maybe loop in my business partner.

Agent: Of course! Would you like me to send you some info you can share with them?

Visitor: Sure, that would help. My email is sarah@creativeminds.io

Agent: Perfect, I''ll send that right over. Feel free to reach out if you have any questions!

Visitor: Will do, thanks!',
    transcription_duration_seconds = COALESCE(rc.duration_seconds, 120),
    transcription_cost = ROUND(COALESCE(rc.duration_seconds, 120) / 60.0 * 0.01, 4),
    transcribed_at = NOW() - INTERVAL '2 minutes',
    ai_summary_status = 'processing'
FROM recent_calls rc
WHERE cl.id = rc.id AND rc.rn = 2;

-- Sample 3: Transcription still processing (3rd most recent)
WITH recent_calls AS (
    SELECT id, organization_id,
           ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at DESC) as rn
    FROM public.call_logs
    WHERE status = 'completed' 
      AND duration_seconds > 30
      AND transcription_status IS NULL
)
UPDATE public.call_logs cl
SET 
    transcription_status = 'processing'
FROM recent_calls rc
WHERE cl.id = rc.id AND rc.rn = 3;

-- ============================================================================
-- STEP 4: ADD SAMPLE USAGE RECORDS
-- ============================================================================

-- Insert usage records for the calls we just updated
INSERT INTO public.usage_records (organization_id, call_log_id, usage_type, duration_seconds, cost)
SELECT 
    organization_id,
    id,
    'transcription',
    COALESCE(transcription_duration_seconds, 180),
    COALESCE(transcription_cost, 0.03)
FROM public.call_logs
WHERE transcription_status = 'completed'
  AND transcription_cost IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.usage_records (organization_id, call_log_id, usage_type, duration_seconds, cost)
SELECT 
    organization_id,
    id,
    'ai_summary',
    COALESCE(transcription_duration_seconds, 180),
    COALESCE(ai_summary_cost, 0.06)
FROM public.call_logs
WHERE ai_summary_status = 'completed'
  AND ai_summary_cost IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (run these to confirm it worked)
-- ============================================================================

-- Check transcription data was added
SELECT 
    id,
    transcription_status,
    ai_summary_status,
    LEFT(transcription, 50) as transcription_preview,
    LEFT(ai_summary, 50) as summary_preview
FROM public.call_logs
WHERE transcription_status IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Check usage records
SELECT 
    usage_type,
    COUNT(*) as count,
    SUM(cost) as total_cost,
    SUM(duration_seconds) / 60.0 as total_minutes
FROM public.usage_records
GROUP BY usage_type;

