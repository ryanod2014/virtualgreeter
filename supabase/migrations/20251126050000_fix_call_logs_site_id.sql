-- Make site_id nullable in call_logs to handle cases where site doesn't exist
ALTER TABLE public.call_logs 
ALTER COLUMN site_id DROP NOT NULL;

