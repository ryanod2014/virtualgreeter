-- ============================================================================
-- POOL VIDEO TEMPLATES
-- ============================================================================
-- Adds intro script and example videos to pools so admins can customize
-- what agents record per pool.
-- ============================================================================

-- Add video template columns to agent_pools
ALTER TABLE public.agent_pools 
  ADD COLUMN IF NOT EXISTS intro_script TEXT DEFAULT 'Hey, do you mind turning on your mic real fast? Quick question for you.',
  ADD COLUMN IF NOT EXISTS example_wave_video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS example_intro_video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS example_loop_video_url TEXT DEFAULT NULL;

-- Add video columns to agent_pool_members (agent's recorded videos PER pool)
ALTER TABLE public.agent_pool_members
  ADD COLUMN IF NOT EXISTS wave_video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intro_video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS loop_video_url TEXT DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.agent_pools.intro_script IS 'The script text agents should read when recording their intro video for this pool';
COMMENT ON COLUMN public.agent_pools.example_wave_video_url IS 'Example video URL for agents to model their wave video (optional, falls back to system default)';
COMMENT ON COLUMN public.agent_pools.example_loop_video_url IS 'Example video URL for agents to model their loop/smile video (optional, falls back to system default)';
COMMENT ON COLUMN public.agent_pool_members.wave_video_url IS 'Agent wave video URL for this specific pool';
COMMENT ON COLUMN public.agent_pool_members.intro_video_url IS 'Agent intro video URL for this specific pool';
COMMENT ON COLUMN public.agent_pool_members.loop_video_url IS 'Agent loop/smile video URL for this specific pool';

