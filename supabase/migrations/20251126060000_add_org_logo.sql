-- ============================================================================
-- ADD LOGO URL TO ORGANIZATIONS
-- ============================================================================

-- Add logo_url column to organizations table
ALTER TABLE public.organizations
ADD COLUMN logo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.logo_url IS 'URL to the organization logo stored in Supabase storage';

-- ============================================================================
-- STORAGE POLICIES FOR LOGOS BUCKET
-- ============================================================================

-- Create logos bucket (run this in Supabase Dashboard if it fails)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Allow admins to upload logos to their org folder
CREATE POLICY "Admins can upload logos to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow admins to update their org's logos
CREATE POLICY "Admins can update their org logos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow admins to delete their org's logos
CREATE POLICY "Admins can delete their org logos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow public read access to logos (they may be displayed on widgets)
CREATE POLICY "Public logo read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

