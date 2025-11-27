-- ============================================================================
-- SEED: Example Pool for Testing Video Re-use Dropdown
-- ============================================================================
-- Run this in Supabase SQL Editor or via: npx supabase db reset
-- This creates a "Sales Team" pool with example videos set

-- Insert example pool (uses your organization's ID)
INSERT INTO public.agent_pools (
  organization_id,
  name,
  description,
  intro_script,
  example_wave_video_url,
  example_intro_video_url,
  example_loop_video_url,
  is_default,
  is_catch_all
)
SELECT 
  o.id,
  'Sales Team',
  'Example pool with pre-set example videos for testing',
  'Hi there! Got a quick second? I wanted to show you something cool.',
  -- Using placeholder video URLs - replace with real ones if you have them
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  false,
  false
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_pools ap 
  WHERE ap.name = 'Sales Team' AND ap.organization_id = o.id
)
LIMIT 1;

-- Also create a "Support Team" pool for more dropdown options
INSERT INTO public.agent_pools (
  organization_id,
  name,
  description,
  intro_script,
  example_wave_video_url,
  example_intro_video_url,
  example_loop_video_url,
  is_default,
  is_catch_all
)
SELECT 
  o.id,
  'Support Team',
  'Another example pool with different videos',
  'Hey! Need help with something? Let me know!',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  false,
  false
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_pools ap 
  WHERE ap.name = 'Support Team' AND ap.organization_id = o.id
)
LIMIT 1;

-- Show what was created
SELECT id, name, example_wave_video_url IS NOT NULL as has_wave, 
       example_intro_video_url IS NOT NULL as has_intro,
       example_loop_video_url IS NOT NULL as has_loop
FROM public.agent_pools 
ORDER BY created_at DESC;

