-- Add visitor_country_code to widget_pageviews for blocklist filtering in analytics
-- This allows filtering pageviews by the organization's country blocklist/allowlist

ALTER TABLE public.widget_pageviews 
ADD COLUMN IF NOT EXISTS visitor_country_code TEXT;

-- Index for efficient filtering by country
CREATE INDEX IF NOT EXISTS idx_widget_pageviews_country 
ON public.widget_pageviews(visitor_country_code);

-- Comment for documentation
COMMENT ON COLUMN public.widget_pageviews.visitor_country_code IS 
'ISO 3166-1 alpha-2 country code of the visitor, used for blocklist filtering in analytics';

