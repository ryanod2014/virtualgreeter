-- ============================================================================
-- RECORDINGS STORAGE BUCKET
-- ============================================================================
-- Creates the recordings bucket for storing call recordings.
-- Recordings are private and only accessible to the organization's admins.
-- ============================================================================

-- Create recordings bucket (private - not public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RECORDINGS BUCKET POLICIES
-- ============================================================================

-- Allow authenticated users to upload recordings to their org folder
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can upload recordings to their org folder'
    ) THEN
        CREATE POLICY "Users can upload recordings to their org folder"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'recordings' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow users to read recordings in their org (for playback)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can read recordings in their org'
    ) THEN
        CREATE POLICY "Users can read recordings in their org"
        ON storage.objects FOR SELECT
        USING (
            bucket_id = 'recordings' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow admins to delete recordings in their org
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Admins can delete recordings in their org'
    ) THEN
        CREATE POLICY "Admins can delete recordings in their org"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'recordings' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END $$;

-- ============================================================================
-- ADD RECORDING URL UPDATE POLICY TO CALL_LOGS
-- ============================================================================

-- Allow users to update recording_url on call_logs in their org
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'call_logs' 
        AND policyname = 'Users can update call logs in their org'
    ) THEN
        CREATE POLICY "Users can update call logs in their org"
        ON public.call_logs FOR UPDATE
        USING (organization_id = public.get_user_organization_id());
    END IF;
END $$;

