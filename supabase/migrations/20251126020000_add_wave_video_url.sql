-- ============================================================================
-- ADD WAVE VIDEO URL TO AGENT PROFILES
-- ============================================================================
-- Adds support for the 3-video intro sequence:
-- 1. wave_video_url: Plays on loop (muted) until user interaction
-- 2. intro_video_url: Plays once with audio after user interaction
-- 3. loop_video_url: Loops forever after intro finishes
-- ============================================================================

ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS wave_video_url TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN public.agent_profiles.wave_video_url IS 'Video that loops muted until user interaction (wave/mimic intro)';

