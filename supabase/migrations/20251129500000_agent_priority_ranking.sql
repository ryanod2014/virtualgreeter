-- ============================================================================
-- AGENT PRIORITY RANKING FOR TIERED ROUTING
-- ============================================================================
-- Adds priority_rank to agent_pool_members for tiered lead distribution.
-- Lower rank = higher priority (gets leads first).
-- Allows junior reps to provide coverage in pools while seniors get priority.
-- ============================================================================

-- Add priority_rank column to agent_pool_members
-- Default of 1 means all existing members are treated as primary/top priority
ALTER TABLE public.agent_pool_members 
ADD COLUMN IF NOT EXISTS priority_rank INTEGER NOT NULL DEFAULT 1;

-- Constraint to ensure positive priority ranks
ALTER TABLE public.agent_pool_members 
ADD CONSTRAINT agent_pool_members_priority_rank_positive 
CHECK (priority_rank >= 1 AND priority_rank <= 10);

-- Index for efficient tiered routing queries (pool + priority ordering)
CREATE INDEX IF NOT EXISTS idx_agent_pool_members_pool_priority 
ON public.agent_pool_members(pool_id, priority_rank);

-- Add helpful comments
COMMENT ON COLUMN public.agent_pool_members.priority_rank IS 
  'Routing priority within pool. Lower number = higher priority.
   1 = Primary (gets leads first)
   2 = Standard (overflow from primary)
   3+ = Backup/Coverage (overflow only when higher tiers at capacity)
   Max value: 10';

-- ============================================================================
-- HELPER VIEW FOR ROUTING QUERIES
-- ============================================================================
-- Makes it easier to query pool members with their priority for routing

CREATE OR REPLACE VIEW public.pool_members_with_priority AS
SELECT 
    apm.id,
    apm.pool_id,
    apm.agent_profile_id,
    apm.priority_rank,
    apm.wave_video_url,
    apm.intro_video_url,
    apm.loop_video_url,
    apm.created_at,
    ap.user_id,
    ap.organization_id,
    ap.display_name,
    ap.status,
    ap.max_simultaneous_simulations,
    ap.is_available,
    ap.is_active
FROM public.agent_pool_members apm
JOIN public.agent_profiles ap ON apm.agent_profile_id = ap.id
WHERE ap.is_active = TRUE
ORDER BY apm.pool_id, apm.priority_rank, apm.created_at;

-- Grant access to the view
GRANT SELECT ON public.pool_members_with_priority TO authenticated;

-- ============================================================================
-- RPC FUNCTION TO GET AGENTS BY POOL WITH PRIORITY
-- ============================================================================
-- Returns agents for a pool ordered by priority rank for tiered routing

CREATE OR REPLACE FUNCTION public.get_pool_agents_by_priority(target_pool_id UUID)
RETURNS TABLE (
    agent_profile_id UUID,
    priority_rank INTEGER,
    display_name TEXT,
    user_id UUID
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        apm.agent_profile_id,
        apm.priority_rank,
        ap.display_name,
        ap.user_id
    FROM public.agent_pool_members apm
    JOIN public.agent_profiles ap ON apm.agent_profile_id = ap.id
    WHERE apm.pool_id = target_pool_id
      AND ap.is_active = TRUE
    ORDER BY apm.priority_rank ASC, apm.created_at ASC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_pool_agents_by_priority(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_pool_agents_by_priority IS 
  'Returns agents in a pool ordered by priority rank for tiered routing.
   Lower priority_rank = higher priority (gets leads first).';

