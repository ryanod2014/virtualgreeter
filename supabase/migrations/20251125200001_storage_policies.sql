-- ============================================================================
-- STORAGE POLICIES FOR VIDEOS BUCKET
-- ============================================================================

-- Allow users to upload videos to their org folder
CREATE POLICY "Users can upload videos to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow users to update their own videos
CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow public read access to all videos (they're embedded on customer sites)
CREATE POLICY "Public video read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

