-- ============================================================================
-- STORAGE BUCKETS AND CALL_LOGS POOL_ID
-- ============================================================================
-- Creates missing storage buckets and adds pool_id to call_logs for analytics
-- ============================================================================

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create videos bucket (for agent intro videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create logos bucket (for organization logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VIDEOS BUCKET POLICIES
-- ============================================================================

-- Allow authenticated users to upload videos to their org folder
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can upload videos to their org folder'
    ) THEN
        CREATE POLICY "Users can upload videos to their org folder"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'videos' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow users to update their own videos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can update their own videos'
    ) THEN
        CREATE POLICY "Users can update their own videos"
        ON storage.objects FOR UPDATE
        USING (
            bucket_id = 'videos' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow public read access to videos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Public video read access'
    ) THEN
        CREATE POLICY "Public video read access"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'videos');
    END IF;
END $$;

-- Allow users to delete videos in their org
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can delete videos in their org'
    ) THEN
        CREATE POLICY "Users can delete videos in their org"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'videos' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- ============================================================================
-- ADD POOL_ID TO CALL_LOGS (for pool-based analytics)
-- ============================================================================

-- Add pool_id column to call_logs
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS pool_id UUID REFERENCES public.agent_pools(id) ON DELETE SET NULL;

-- Create index for pool-based analytics queries
CREATE INDEX IF NOT EXISTS idx_call_logs_pool_id ON public.call_logs(pool_id);

-- Comment for documentation
COMMENT ON COLUMN public.call_logs.pool_id IS 'The pool the visitor was routed to (for analytics)';


