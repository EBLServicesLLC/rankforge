-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Add linkedin_urn column to settings table
-- Run this in Supabase SQL Editor (one time)
-- ─────────────────────────────────────────────────────────────────────────────

-- Add LinkedIn member URN column (needed for posting API calls)
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS linkedin_urn text;

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'settings'
  AND column_name IN ('fb_token', 'fb_page_id', 'linkedin_token', 'linkedin_urn')
ORDER BY column_name;

-- ─────────────────────────────────────────────────────────────────────────────
-- Expected output:
--   fb_page_id     | text
--   fb_token       | text
--   linkedin_token | text
--   linkedin_urn   | text
-- ─────────────────────────────────────────────────────────────────────────────
