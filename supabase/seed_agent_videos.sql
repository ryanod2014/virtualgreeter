-- ============================================================================
-- SEED: Sample Agent Pool Videos for Testing Admin Video Preview
-- ============================================================================
-- Run this in Supabase SQL Editor to add sample videos to agent pool memberships
-- This allows testing the clickable video preview feature in Admin > Agents

-- First, ensure the current user is an agent (activate their profile)
UPDATE public.agent_profiles 
SET is_active = true
WHERE user_id IN (SELECT id FROM public.users LIMIT 1);

-- Get the first agent profile and first org
DO $$
DECLARE
  v_agent_id UUID;
  v_org_id UUID;
  v_pool1_id UUID;
  v_pool2_id UUID;
BEGIN
  -- Get first active agent
  SELECT id, organization_id INTO v_agent_id, v_org_id
  FROM public.agent_profiles 
  WHERE is_active = true 
  LIMIT 1;
  
  IF v_agent_id IS NULL THEN
    RAISE NOTICE 'No active agent found. Creating one from first user...';
    
    -- Create agent profile from first user
    INSERT INTO public.agent_profiles (user_id, organization_id, display_name, is_active)
    SELECT u.id, u.organization_id, COALESCE(u.full_name, 'Test Agent'), true
    FROM public.users u
    LIMIT 1
    ON CONFLICT (user_id) DO UPDATE SET is_active = true
    RETURNING id, organization_id INTO v_agent_id, v_org_id;
  END IF;
  
  RAISE NOTICE 'Using agent: %, org: %', v_agent_id, v_org_id;
  
  -- Ensure Sales Team pool exists
  INSERT INTO public.agent_pools (organization_id, name, intro_script, is_default, is_catch_all)
  VALUES (v_org_id, 'Sales Team', 'Hi! Want to see something amazing?', false, false)
  ON CONFLICT (organization_id, name) DO NOTHING;
  
  SELECT id INTO v_pool1_id FROM public.agent_pools 
  WHERE organization_id = v_org_id AND name = 'Sales Team';
  
  -- Ensure Support Team pool exists
  INSERT INTO public.agent_pools (organization_id, name, intro_script, is_default, is_catch_all)
  VALUES (v_org_id, 'Support Team', 'Need help with something?', false, false)
  ON CONFLICT (organization_id, name) DO NOTHING;
  
  SELECT id INTO v_pool2_id FROM public.agent_pools 
  WHERE organization_id = v_org_id AND name = 'Support Team';
  
  RAISE NOTICE 'Pools: Sales=%, Support=%', v_pool1_id, v_pool2_id;
  
  -- Add agent to Sales Team with ALL videos (complete set)
  INSERT INTO public.agent_pool_members (pool_id, agent_profile_id, wave_video_url, intro_video_url, loop_video_url)
  VALUES (
    v_pool1_id, 
    v_agent_id,
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
  )
  ON CONFLICT (pool_id, agent_profile_id) DO UPDATE SET
    wave_video_url = EXCLUDED.wave_video_url,
    intro_video_url = EXCLUDED.intro_video_url,
    loop_video_url = EXCLUDED.loop_video_url;
  
  -- Add agent to Support Team with PARTIAL videos (missing intro)
  INSERT INTO public.agent_pool_members (pool_id, agent_profile_id, wave_video_url, intro_video_url, loop_video_url)
  VALUES (
    v_pool2_id, 
    v_agent_id,
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    NULL,  -- Missing intro video
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
  )
  ON CONFLICT (pool_id, agent_profile_id) DO UPDATE SET
    wave_video_url = EXCLUDED.wave_video_url,
    intro_video_url = NULL,
    loop_video_url = EXCLUDED.loop_video_url;
    
  RAISE NOTICE 'Sample videos added successfully!';
END $$;

-- Show the results
SELECT 
  ap.display_name as agent,
  p.name as pool,
  CASE WHEN apm.wave_video_url IS NOT NULL THEN '✓' ELSE '✗' END as wave,
  CASE WHEN apm.intro_video_url IS NOT NULL THEN '✓' ELSE '✗' END as intro,
  CASE WHEN apm.loop_video_url IS NOT NULL THEN '✓' ELSE '✗' END as loop
FROM public.agent_pool_members apm
JOIN public.agent_profiles ap ON ap.id = apm.agent_profile_id
JOIN public.agent_pools p ON p.id = apm.pool_id
WHERE ap.is_active = true
ORDER BY ap.display_name, p.name;

