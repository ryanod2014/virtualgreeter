-- ============================================================================
-- ADD CONNECT VIDEO URL TO AGENT PROFILES
-- ============================================================================
-- Adds support for the 4th video in the intro sequence:
-- 1. wave_video_url: Plays on loop (muted) until user interaction
-- 2. intro_video_url: Plays once with audio after user interaction
-- 3. connect_video_url: Plays when visitor turns on their mic
-- 4. loop_video_url: Loops forever after connect video finishes
-- ============================================================================

ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS connect_video_url TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN public.agent_profiles.connect_video_url IS 'Video that plays when visitor enables their microphone';

