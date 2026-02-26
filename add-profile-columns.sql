-- Migration: Add has_set_full_name and use_initials columns to profiles table
-- Run this in your Supabase SQL Editor

-- Add has_set_full_name column (tracks if user has explicitly saved their name)
-- Default is false - backfill logic will only run when this is false AND full_name is null
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_set_full_name BOOLEAN DEFAULT false;

-- Add use_initials column (for MVP, always true since we don't support avatar uploads yet)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS use_initials BOOLEAN DEFAULT true;

-- Update existing profiles to have has_set_full_name = true if they already have a full_name
-- This prevents backfill from overwriting existing names
UPDATE public.profiles 
SET has_set_full_name = true 
WHERE full_name IS NOT NULL AND full_name != '' AND has_set_full_name IS NOT true;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
