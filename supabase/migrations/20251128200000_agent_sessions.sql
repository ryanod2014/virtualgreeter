-- ============================================================================
-- AGENT SESSIONS & ACTIVITY TRACKING
-- ============================================================================
-- This migration adds:
-- 1. agent_sessions - Tracks each login-to-logout session
-- 2. agent_status_changes - Audit log of status transitions within sessions
-- 3. RPC function for atomic time increments
-- ============================================================================

-- ============================================================================
-- AGENT SESSIONS TABLE
-- ============================================================================
-- Tracks each login-to-logout session for an agent.
-- A session starts when agent connects to signaling server and ends on disconnect.

CREATE TABLE public.agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Session boundaries
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ DEFAULT NULL,  -- NULL = session still active
    
    -- Computed duration (seconds) - set when session ends
    duration_seconds INTEGER DEFAULT NULL,
    
    -- Time breakdown (updated incrementally and on session end)
    idle_seconds INTEGER NOT NULL DEFAULT 0,
    in_call_seconds INTEGER NOT NULL DEFAULT 0,
    away_seconds INTEGER NOT NULL DEFAULT 0,
    
    -- How the session ended
    ended_reason TEXT CHECK (ended_reason IN ('logout', 'disconnect', 'idle_timeout', 'server_restart')) DEFAULT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying agent's sessions by date (most common query)
CREATE INDEX idx_agent_sessions_agent_date 
ON public.agent_sessions(agent_id, started_at DESC);

-- Index for org-wide queries (team overview)
CREATE INDEX idx_agent_sessions_org_date 
ON public.agent_sessions(organization_id, started_at DESC);

-- Index for finding active sessions
CREATE INDEX idx_agent_sessions_active 
ON public.agent_sessions(agent_id) 
WHERE ended_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE public.agent_sessions IS 'Tracks each login-to-logout session for agents';
COMMENT ON COLUMN public.agent_sessions.duration_seconds IS 'Total session duration in seconds, calculated on session end';
COMMENT ON COLUMN public.agent_sessions.idle_seconds IS 'Time spent in idle/available status';
COMMENT ON COLUMN public.agent_sessions.in_call_seconds IS 'Time spent on calls';
COMMENT ON COLUMN public.agent_sessions.away_seconds IS 'Time spent in away status';


-- ============================================================================
-- AGENT STATUS CHANGES TABLE
-- ============================================================================
-- Audit log of every status change within a session.
-- Used to calculate time breakdowns and for detailed timeline view.

CREATE TABLE public.agent_status_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
    
    -- Status transition
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL CHECK (to_status IN ('idle', 'in_call', 'away', 'offline')),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Optional context
    reason TEXT  -- e.g., 'call_started', 'call_ended', 'ring_no_answer', 'manual'
);

-- Index for querying status changes within a session
CREATE INDEX idx_status_changes_session 
ON public.agent_status_changes(session_id, changed_at);

-- Index for querying by agent
CREATE INDEX idx_status_changes_agent 
ON public.agent_status_changes(agent_id, changed_at DESC);

-- Comments for documentation
COMMENT ON TABLE public.agent_status_changes IS 'Audit log of agent status transitions within sessions';
COMMENT ON COLUMN public.agent_status_changes.reason IS 'Context for the status change (e.g., call_started, ring_no_answer)';


-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_status_changes ENABLE ROW LEVEL SECURITY;

-- Admins can see all sessions in their org
CREATE POLICY "Admins can view org sessions"
ON public.agent_sessions FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Agents can see their own sessions
CREATE POLICY "Agents can view own sessions"
ON public.agent_sessions FOR SELECT
TO authenticated
USING (
    agent_id IN (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
    )
);

-- Admins can view org status changes
CREATE POLICY "Admins can view org status changes"
ON public.agent_status_changes FOR SELECT
TO authenticated
USING (
    agent_id IN (
        SELECT ap.id FROM public.agent_profiles ap
        JOIN public.users u ON ap.organization_id = u.organization_id
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- Agents can view own status changes
CREATE POLICY "Agents can view own status changes"
ON public.agent_status_changes FOR SELECT
TO authenticated
USING (
    agent_id IN (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
    )
);


-- ============================================================================
-- RPC FUNCTION FOR ATOMIC TIME INCREMENT
-- ============================================================================
-- Used by the server to atomically increment session time fields

CREATE OR REPLACE FUNCTION public.increment_session_time(
    p_session_id UUID,
    p_field TEXT,
    p_seconds INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate field name to prevent SQL injection
    IF p_field NOT IN ('idle_seconds', 'in_call_seconds', 'away_seconds') THEN
        RAISE EXCEPTION 'Invalid field name: %', p_field;
    END IF;
    
    -- Perform the update
    EXECUTE format(
        'UPDATE public.agent_sessions SET %I = %I + $1 WHERE id = $2',
        p_field, p_field
    ) USING p_seconds, p_session_id;
END;
$$;

-- Grant execute to service role (server-side only)
REVOKE ALL ON FUNCTION public.increment_session_time FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_session_time TO service_role;

COMMENT ON FUNCTION public.increment_session_time IS 'Atomically increments a time field on an agent session';

